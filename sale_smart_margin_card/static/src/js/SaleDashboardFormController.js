/** @odoo-module **/

import { FormController } from "@web/views/form/form_controller";
import { formView } from "@web/views/form/form_view";
import { registry } from "@web/core/registry";
import { SaleDashboardDialog } from "./revenue_cog_margin_dashboard.js";
import { rpc } from "@web/core/network/rpc";
import { useState, onWillStart } from "@odoo/owl";

class SaleDashboardFormController extends FormController {
    setup() {
        super.setup();
        this.state = useState({
            currentResId: this.props.resId,
        });

        onWillStart(async () => {
            this.state.currentResId = this.props.resId || await this.getCurrentResId();
        });
    }

    async getCurrentResId() {
        return this.model.root.resId || this.props.resId;
    }

    async onPagerUpdate({ offset, resIds }) {
        await super.onPagerUpdate({ offset, resIds });
        this.state.currentResId = resIds[offset];
    }

    async create() {
        await super.create();
        this.state.currentResId = this.props.resId;
    }

    async actionSmartMarginCard() {
        if (!this.state.currentResId) {
            this.env.services.dialog.add(SaleDashboardDialog, {
                revenue: 0,
                cogs: 0,
                margin: 0,
                resId: null,
                title: "Strategic Revenue Insights",
            });
            return;
        }

        const order = await rpc(`/web/dataset/call_kw/sale.order/read`, {
            model: "sale.order",
            method: "read",
            args: [[this.state.currentResId], ["total_revenue", "total_cogs", "net_margin"]],
            kwargs: {},
        });

        this.env.services.dialog.add(SaleDashboardDialog, {
            revenue: order[0].total_revenue,
            cogs: order[0].total_cogs,
            margin: order[0].net_margin,
            resId: this.state.currentResId,
        });
    }
}

SaleDashboardFormController.template = "sale_smart_margin_card.modelInfoBtn";
export const modelInfoView = {
    ...formView,
    Controller: SaleDashboardFormController,
};

registry.category("views").add("model_info", modelInfoView);
