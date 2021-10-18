
async function render() {
    let house = await d3.csv('Melbourne_housing_FULL.csv')
    await render_map(house)
    await render_bar(house)
    await render_bar_suburb(house)


}


render()


async function render_map(house) {

    house = d3.rollups(house, d => d.length, d => d.Suburb).map(d => {
        return {
            Suburb: d[0],
            transaction_count: d[1]
        }
    })


    let mapdata = await d3.json('vic.json')
    let vic_data = topojson.feature(mapdata, mapdata.objects.vic)
    let LOC_NAME_select = d3.groups(vic_data.features, d => d.properties.LOC_NAME).map(d => d[0])
    let map = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 1200,
        "height": 600,

        "data": {
            "values": vic_data,

            "format": { "property": "features" }

        },
        "params": [{
            "name": "LOC_NAME_select",
            "bind": {
                "input": "select",
                "options": [null, ...LOC_NAME_select],
                "labels": ["Show All", ...LOC_NAME_select],

            }
        }],
        "transform": [

            { "filter": "LOC_NAME_select == null || datum.properties.LOC_NAME == LOC_NAME_select" },

            {
                "lookup": "properties.LOC_NAME",
                "from": {
                    "data": { "values": house },
                    "key": "Suburb",
                    "fields": ["transaction_count", 'Suburb']
                }
            }],
        "projection": {
            "type": "mercator"
        },

        "layer": [

            {
                "mark": { "type": "geoshape" },
                "encoding": {
                    "stroke": { "value": "gray" },
                    "fillOpacity": { "value": "0.1" }
                }

            },
            {

                "mark": { "type": "geoshape" },
                "encoding": {

                    "fill": {
                        "field": "transaction_count",
                        "type": "quantitative",
                        "scale": {
                            "range": ['blue', 'yellow']
                        }
                    },
                    "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal","title":"Suburb" }
                        , { "field": "transaction_count", "type": "quantitative",format:".1%","title":"Sales Count" }]

                }
            }


        ]



    }


    vegaEmbed("#map", map);
}
function render_bar(house) {
    let Qy = d3.timeParse('%e/%m/%Y')
    house.sort((a, b) => Qy(a.Date) > Qy(b.Date) ? 1 : -1)
    let bar_data = d3.rollups(house, d => d3.median(d, v => v.Price), d => d3.timeFormat('%Y-Q%q')(new Date(d.Date)))
    bar_data.forEach((d, i, arr) => {
        if (i) {
            d[2] = (d[1] - arr[i - 1][1]) / d[1]
        } else {
            d[2] = 0
        }
    })

    let data = bar_data.map(d => {
        return {
            quarter: d[0],
            median: d[1],
            qoq: d[2]
        }
    })

    let barjson = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "A bar chart showing the US population distribution of age groups in 2000.",
        "width": 400,
        "height": 500,
        "data": { "values": data },


        "encoding": {
            "y": { "field": "quarter" },
            "x": {

                "field": "qoq",
                "type": "quantitative",
                "title": "qoq",
                "axis": { "format": ".2%" }
            }

        },
        "layer": [
            { "mark": "bar" },
            {
                "mark": {
                    "type": "text",
                    "align": "left",
                    "baseline": "middle",
                    "dx": 3
                },
                "encoding": {
                    "text": { "field": "qoq", "type": "quantitative", "format": ".2%" }
                }
            }
        ]
    }

    vegaEmbed("#bar", barjson);

}



function render_bar_suburb(house) {
    let Qy = d3.timeParse('%e/%m/%Y')
    house.sort((a, b) => Qy(a.Date) > Qy(b.Date) ? 1 : -1)
    let bar_data = d3.rollups(house, d => d3.median(d, v => v.Price), d => d.Suburb, d => d3.timeFormat('%Y-Q%q')(new Date(d.Date)))
    bar_data.forEach(item => {

        item[1].forEach((d, i, arr) => {
            if (i) {
                d[2] = (d[1] - arr[i - 1][1]) / (d[1] ? d[1] : 1)
            } else {
                d[2] = 0
            }
        })

        item[2] = d3.sum(item[1], d => d[2])
    })

    let data = bar_data.map(d => {
        return {
            suburb: d[0],
            detail: d[1],
            cum_diff: d[2]
        }
    })

    let barjson = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "title.",
        "width": 400,
        "height": 500,
        "params": [
            {
                "name": "suburbRank", "value": 10,
                "bind": { "input": "range", "min": 0, "max": 50, "step": 1 }
            }
        ],
        "data": { "values": data },

        "transform": [
            {
                "window": [{
                    "op": "rank",
                    "as": "rank"
                }],
                "sort": [{ "field": "cum_diff", "order": "descending" }]
            }, {
                "filter": { "field": "rank", "lte": { "expr": "suburbRank" } }
            }
        ],
        "encoding": {
            "y": {
                "field": "suburb",
                "sort": { "field": "cum_diff", "op": "sum", "order": "descending" }
            },
            "x": {

                "field": "cum_diff",
                "type": "quantitative",
                "title": "cum_diff",
                "axis": { "format": ".2%" },

            },
            "tooltip": [{ "field": "suburb", "type": "norminal","title":"Suburb" }
                        , { "field": "cum_diff", "type": "quantitative",format:".1%","title":"Median Price Growth" }]

        },
        "layer": [
            { "mark": "bar" },
            {
                "mark": {
                    "type": "text",
                    "align": "left",
                    "baseline": "middle",
                    "dx": 3
                },
                "encoding": {
                    "text": { "field": "cum_diff", "type": "quantitative", "format": ".2%" },
                    "tooltip": [{ "field": "suburb", "type": "norminal","title":"Suburb" }
                        , { "field": "cum_diff", "type": "quantitative",format:".1%","title":"Median Price Growth" }]
                }
            }
        ]
    }

    vegaEmbed("#bar_suburb", barjson);

}
