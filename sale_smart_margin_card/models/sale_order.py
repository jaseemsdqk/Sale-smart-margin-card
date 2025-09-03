from odoo import api, fields, models


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    total_revenue = fields.Float(compute='_compute_financial_metrics',
                                 store=True)
    total_cogs = fields.Float(compute='_compute_financial_metrics', store=True)
    net_margin = fields.Float(compute='_compute_financial_metrics', store=True)

    @api.depends('order_line.product_id.standard_price',
                 'order_line.product_uom_qty', 'order_line.price_tax', 'state',
                 'order_line.landed_cost', 'order_line.overhead_cost')
    def _compute_financial_metrics(self):
        for order in self:
            revenue = sum(line.price_subtotal for line in order.order_line)
            cogs = sum((
                               line.product_id.standard_price + line.landed_cost + line.overhead_cost) * line.product_uom_qty
                       for line in order.order_line)
            cogs += sum(line.price_tax for line in order.order_line)
            order.total_revenue = revenue
            order.total_cogs = cogs
            order.net_margin = revenue - cogs

            if order.id:
                channel = "sale_order_update"
                line_data = [{
                    'product': line.product_id.display_name or "Unknown",
                    'sold_qty': line.product_uom_qty,
                    'unit_price': line.price_unit,
                    'landed_cost': line.landed_cost,
                    'landed_breakdown': line._get_landed_breakdown(),
                    'overhead': line.overhead_cost,
                    'overhead_breakdown': line._get_overhead_breakdown(),
                    'line_margin': (line.price_subtotal - ((
                                                                   line.product_id.standard_price + line.landed_cost + line.overhead_cost) * line.product_uom_qty)),
                } for line in order.order_line]
                total_data = {
                    'sale_id': order.id,
                    'total_revenue': revenue,
                    'total_cogs': cogs,
                    'net_margin': order.net_margin,
                    'line_data': line_data,
                }
                self.env['bus.bus']._sendone(channel, 'notification',
                                             total_data)

    def write(self, vals):
        result = super(SaleOrder, self).write(vals)
        if 'state' in vals or any(key in vals for key in ['order_line',
                                                          'order_line.product_id.standard_price']):
            for order in self:
                if order.id:
                    order._compute_financial_metrics()
                    channel = "sale_order_update"
                    line_data = [{
                        'product': line.product_id.display_name or "Unknown",
                        'sold_qty': line.product_uom_qty,
                        'unit_price': line.price_unit,
                        'landed_cost': line.landed_cost,
                        'landed_breakdown': line._get_landed_breakdown(),
                        'overhead': line.overhead_cost,
                        'overhead_breakdown': line._get_overhead_breakdown(),
                        'line_margin': (line.price_subtotal - ((
                                                                       line.product_id.standard_price + line.landed_cost + line.overhead_cost) * line.product_uom_qty)),
                    } for line in order.order_line]
                    data = {
                        'sale_id': order.id,
                        'total_revenue': order.total_revenue,
                        'total_cogs': order.total_cogs,
                        'net_margin': order.net_margin,
                        'line_data': line_data,
                    }
                    self.env['bus.bus']._sendone(channel, 'notification', data)
        return result






class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    landed_cost = fields.Float(string="Landed Cost", compute='_compute_costs',
                               store=True)
    overhead_cost = fields.Float(string="Overhead Cost",
                                 compute='_compute_costs', store=True)

    @api.depends('product_id', 'product_uom_qty', 'order_id.state')
    def _compute_costs(self):
        IrConfig = self.env['ir.config_parameter'].sudo()
        overhead_type = IrConfig.get_param('sale_smart_margin_card.overhead_type',
                                           'fixed')

        overhead_value = float(
            IrConfig.get_param('sale_smart_margin_card.overhead_value', 0.0))
        category_id = int(
            IrConfig.get_param('sale_smart_margin_card.overhead_category_id',
                               False) or 0)

        print("_compute_costs",overhead_value)
        print("_compute_costs",overhead_type)

        for line in self:
            # Landed Cost
            landed_total = 0.0
            if line.order_id.state in ('sale', 'done') and line.move_ids:
                moves = line.move_ids.filtered(lambda m: m.state == 'done')
                landed_costs = self.env['stock.landed.cost'].search(
                    [('picking_ids', 'in', moves.picking_id.ids)])
                for cost in landed_costs:
                    for cost_line in cost.cost_lines:
                        if cost_line.product_id == line.product_id:
                            landed_total += cost_line.price_unit * line.product_uom_qty
            line.landed_cost = landed_total / line.product_uom_qty if line.product_uom_qty else 0.0

            # Overhead: Prefer analytic lines, fallback to config
            analytic_lines = self.env['account.analytic.line'].search(
                [('so_line', '=', line.id), ('amount', '!=', 0)])
            if analytic_lines:
                overhead_total = sum(al.amount for al in analytic_lines)
                line.overhead_cost = overhead_total / line.product_uom_qty if line.product_uom_qty else 0.0
            else:
                use_category = (
                            category_id and line.product_id.categ_id and line.product_id.categ_id.id == category_id)
                if overhead_type == 'fixed':
                    per_unit = overhead_value if use_category or not category_id else 0.0
                else:
                    base_cost = line.product_id.standard_price + line.landed_cost
                    per_unit = (base_cost * overhead_value / 100.0) if (
                                use_category or not category_id) else 0.0
                line.overhead_cost = per_unit
                print("final_compute_costs",line.overhead_cost)

            # Trigger update
            if line.order_id.id:
                line.order_id._compute_financial_metrics()

    def _get_landed_breakdown(self):
        breakdown = {'freight': 0.0, 'customs': 0.0, 'other': 0.0}
        if self.move_ids:
            moves = self.move_ids.filtered(lambda m: m.state == 'done')
            landed_costs = self.env['stock.landed.cost'].search(
                [('picking_ids', 'in', moves.picking_id.ids)])
            for cost in landed_costs:
                for cost_line in cost.cost_lines:
                    if cost_line.product_id == self.product_id:
                        name = (cost_line.name or '').lower()
                        value = (cost_line.price_unit or 0.0) * (
                                    self.product_uom_qty or 1)
                        if 'freight' in name:
                            breakdown['freight'] += value
                        elif 'customs' in name:
                            breakdown['customs'] += value
                        else:
                            breakdown['other'] += value
        return breakdown

    def _get_overhead_breakdown(self):
        breakdown = {}
        analytic_lines = self.env['account.analytic.line'].search(
            [('so_line', '=', self.id)])
        for al in analytic_lines:
            account_name = al.account_id.name or 'Unknown'
            amount = al.amount or 0.0
            breakdown[account_name] = breakdown.get(account_name, 0.0) + amount
        if not breakdown:
            breakdown = {'analytical': self.overhead_cost or 0.0}
        return breakdown
