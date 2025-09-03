/** @odoo-module **/

import { Component, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { ProductDialog } from "./product_dialog";

export class SaleDashboardDialog extends Component {
    static template = "sale_smart_margin_card.infoDialog";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirmLabel: { type: String, optional: true },
        confirmClass: { type: String, optional: true },
        revenue: { type: Number, optional: true },
        cogs: { type: Number, optional: true },
        margin: { type: Number, optional: true },
        close: { type: Function, optional: true },
        resId: { type: Number, optional: true },
    };
    static defaultProps = {
        confirmLabel: _t("Close"),
        confirmClass: "btn-primary",
    };

    setup() {
        this.chartCanvas = useRef("chartCanvas");
        this.chartInstance = null;
        this.state = useState({
            lineData: [],
        });
        onMounted(this.renderChart);
        onWillUnmount(() => {
            if (this.chartInstance) this.chartInstance.destroy();
            if (this.props.resId) {
                this.env.services.bus_service.deleteChannel("sale_order_update");
            }
        });

        this.busService = this.env.services.bus_service;
        if (this.props.resId) {
            this.busService.addChannel("sale_order_update");
            this.busService.subscribe('notification', this.onMessage.bind(this));
        }
    }

    onMessage(data) {
        if (data.sale_id === this.props.resId) {
            this.props.revenue = data.total_revenue || this.props.revenue;
            this.props.cogs = data.total_cogs || this.props.cogs;
            this.props.margin = data.net_margin || this.props.margin;
            this.state.lineData = data.line_data || [];
            this.renderChart();
        }
    }

    clickClose() {
        this.props.close();
    }

    handleOpenProductDialog() {
        console.log("handleOpenProductDialog", this.props.resId);
        this.env.services.dialog.add(ProductDialog, {
            saleId: this.props.resId,
            lineData: this.state.lineData,
            close: () => this.env.services.dialog.close(),
        });
    }

    renderChart() {
        if (typeof Chart === "undefined") {
            console.error("Chart.js is not loaded.");
            return;
        }
        const { revenue, cogs, margin } = this.props;
        const ctx = this.chartCanvas.el.getContext("2d");
        if (this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Total Revenue", "COGS", "Net Margin"],
                datasets: [{
                    label: "Smart Margin Card",
                    data: [revenue || 0, cogs || 0, margin || 0],
                    backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)", "rgba(54, 162, 235, 0.6)"],
                    borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)"],
                    borderWidth: 1,
                }],
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: "Amount ($)" }
                    }
                },
                plugins: { legend: { display: true } },
                onClick: this.handleOpenProductDialog.bind(this),
            },
        });
    }
}
