
async function render() {
    let house = await d3.csv('Melbourne_housing_FULL.csv')

    house = d3.rollups(house, d => d.length, d => d.Suburb).map(d => {
        return {
            Suburb: d[0],
            transaction_count: d[1]
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
                            "fields": ["transaction_count", 'Suburb']
                        }
                    }
                ],
                "mark": { "type": "geoshape" },
                "encoding": {

                    "fill": {
                        "field": "transaction_count",
                        "type": "quantitative",
                        "scale": {
                            "type":"threhold",
                            "range": ['blue', 'yellow']
                        }
                    },
                    "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal","title":"Suburb" }
                        , { "field": "transaction_count", "type": "quantitative" ,"title":"Sales"}]

                }
            }


        ]



    }


    vegaEmbed("#map", map).then(function(result){

    }).catch(console.error);

}


render()