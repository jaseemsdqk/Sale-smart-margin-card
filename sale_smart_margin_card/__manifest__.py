{
    'name': 'Sale Dashboard',
    'version': '1.0',
    'category': 'Sales',
    'summary': 'Custom Sale Order Dashboard with Financial Metrics Chart',
    'depends': ['sale_management', 'stock_landed_costs', 'account'],
    'data': [
        'views/sale_order_views.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'https://cdn.jsdelivr.net/npm/chart.js',
            'sale_smart_margin_card/static/src/**/*',
        ],
    },
    'installable': True,
    'auto_install': False,
}
