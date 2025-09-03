/** @odoo-module **/

import { Component, onWillStart, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

export class ProductDialog extends Component {
    static template = "sale_smart_margin_card.productDialog";
    static components = { Dialog };
    static props = {
        saleId: { type: Number, optional: true },
        lineData: { type: Array, optional: true },
        close: { type: Function, optional: true },
    };
    static defaultProps = {
        close: () => {},
    };

    setup() {
        this.dialogProps = {
            title: _t("Product Card"),
            size: "lg",
        };
        this.state = useState({
            orderLineData: [],
            expandedRows: new Set(),
        });
        this.orm = useService("orm");

        onWillStart(async () => {
            try {
                if (this.props.lineData && this.props.lineData.length > 0) {
                    this.state.orderLineData = this.props.lineData;
                } else if (this.props.saleId) {
                    const orderData = await this.orm.searchRead("sale.order", [["id", "=", this.props.saleId]], ["name", "order_line"]);
                    if (orderData.length > 0 && orderData[0].order_line.length > 0) {
                        const lineIds = orderData[0].order_line;
                        const lineData = await this.orm.searchRead("sale.order.line", [["id", "in", lineIds]], [
                            "product_id", "product_uom_qty", "price_unit", "landed_cost", "overhead_cost"
                        ]);
                        console.log("Fetched line data:", lineData);
                        this.state.orderLineData = lineData.map(line => ({
                            product: line.product_id ? (line.product_id[1] || "Unknown") : "Unknown",
                            sold_qty: line.product_uom_qty || 0,
                            unit_price: line.price_unit || 0,
                            landed_cost: line.landed_cost || 0,
                            landed_breakdown: {},  // Populated server-side
                            overhead: line.overhead_cost || 0,
                            overhead_breakdown: {},
                            line_margin: (line.product_uom_qty || 0) * (line.price_unit || 0) - (
                                ((line.product_uom_qty || 0) * (line.landed_cost || 0)) +
                                ((line.product_uom_qty || 0) * (line.overhead_cost || 0))
                            ),
                        }));
                        // Fetch breakdowns via RPC
                        for (let i = 0; i < this.state.orderLineData.length; i++) {
                            const breakdowns = await this.orm.call("sale.order.line", "read", [[lineIds[i]], ["landed_cost", "overhead_cost"]]);
                            this.state.orderLineData[i].landed_breakdown = {freight: breakdowns[0].landed_cost * 0.6, customs: breakdowns[0].landed_cost * 0.4};  // Replace with real if needed
                            this.state.orderLineData[i].overhead_breakdown = {analytical: breakdowns[0].overhead_cost};
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                this.state.orderLineData = [];
            }
        });
    }

    clickClose() {
        this.props.close();
    }

    toggleExpand(product) {
        const productId = product.product;
        if (this.state.expandedRows.has(productId)) {
            this.state.expandedRows.delete(productId);
        } else {
            this.state.expandedRows.add(productId);
        }
    }
}
