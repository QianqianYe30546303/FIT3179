
async function render() {
    let house = await d3.csv('Melbourne_housing_FULL.csv')

    house = d3.rollups(house, d => d.length, d => d.Suburb).map(d => {
        return {
            Suburb: d[0],
            count_of_transactions: d[1]
        }
    })

    let mapdata = await d3.json('vic.json')
    let vic_data = topojson.feature(mapdata, mapdata.objects.vic)


    let map = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 1200,
        "height": 600,

        "data": {
            "values": vic_data,

            "format": { "property": "features" }

        },


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
                "transform": [

                    {
                        "lookup": "properties.LOC_NAME",
                        "from": {
                            "data": { "values": house },
                            "key": "Suburb",
                            "fields": ["count_of_transactions", 'Suburb']
                        }
                    }
                ],
                "mark": { "type": "geoshape" },
                "encoding": {

                    "fill": {
                        "field": "count_of_transactions",
                        "type": "quantitative",
                        "scale": {
                            "range": ['blue', 'yellow']
                        }
                    },
                    "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal" }
                        , { "field": "count_of_transactions", "type": "quantitative" }]

                }
            }


        ]



    }


    vegaEmbed("#map", map);

}


render()