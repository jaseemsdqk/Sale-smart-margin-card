from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    dashboard_overhead_type = fields.Selection([
        ('fixed', 'Fixed per Unit'), ('percent', 'Percentage of Cost')
    ], string='Default Overhead Type',
        config_parameter='sale_smart_margin_card.overhead_type', default='fixed')

    dashboard_overhead_value = fields.Float(
        string='Overhead Value (Amount or %)',
        config_parameter='sale_smart_margin_card.overhead_value',
        default=0.0,
        help='If type is Fixed: amount per unit. If Percent: % of cost per unit.')

    dashboard_overhead_category_id = fields.Many2one(
        'product.category', string='Category for Overhead Config',
        config_parameter='sale_smart_margin_card.overhead_category_id',
        help='Apply overhead config for this product category (optional).')
