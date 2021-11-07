
async function render() {
    let house = await d3.csv('Melbourne_housing_FULL.csv')
    await render_map(house)
    await render_bar(house)
    await render_bar_suburb(house)
    await render_map_sales(house)
    await render_housing_scatter(house)



}


render()


async function render_map(house) {

    house = d3.rollups(house, d => {
        return {
            for_sale: d.length, //no. of properties for sale
            Propertycount: d3.max(d, v => v.Propertycount) //total in the suburb
        }
    }, d => d.Suburb).map(d => {
        return {
            Suburb: d[0],
            forsale_rate: d[1].for_sale / (+d[1].Propertycount) 
        }
    })


    let mapdata = await d3.json('vic.json')
    let vic_data = topojson.feature(mapdata, mapdata.objects.vic)
    let LOC_NAME_select = d3.groups(vic_data.features, d => d.properties.LOC_NAME).map(d => d[0])
    let map = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 401,
        "height":360,
        "title": "Housing for sale per Suburb in Greater Melbourne 2016-2018",

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
            "name":"Suburb Selection: "
            }
        },
        {
            "name": "zoom_level",
            "value": 17000, //default scale
            "bind": {
              "input": "range",
              "min": 10000,
              "max": 100000,
              "step": 150,
              "name": "Zoom: "
            }
        },
        {
            "name": "center_to",
            "value": [144.96,-37.8], //default centre central MEL
            "bind": {
              "input": "select",
              "options": [
                [144.96,-37.8],
                [144.9, -37.66],
                [144.69,-37.62],
                [145.24, -37.83],
                [145.22, -37.94],
                [144.77, -37.79]
              ],
              "labels": ["Central Melbourne", "North Part", 
              "North West", 
              "East", "South East", "South West"],
              "name": "Map Centre: "
            }
          }

        ],
        "transform": [

            { "filter": "LOC_NAME_select == null || datum.properties.LOC_NAME == LOC_NAME_select" },
        
            {
                "lookup": "properties.LOC_NAME",
                "from": {
                    "data": { "values": house },
                    "key": "Suburb",
                    "fields": ["forsale_rate", 'Suburb']
                }
            }],
        "projection": {
            "type": "mercator",
            "center":{"expr": "center_to"},
            "scale":{"expr": "zoom_level"}
        
        
        },

        "layer": [

            {
                "mark": { "type": "geoshape" },
                "encoding": {
                    "stroke": { "value": "gray" },
                    "fillOpacity": { "value": "0.1"},
                "tooltip":[{"field":"properties.LOC_NAME", "type":"nominal", "title":"Suburb"},
            {"field":"forsale_rate", "title":"For Sale Rate"}]
                }

            },
            {

                "mark": { "type": "geoshape" },
                "encoding": {
                    "stroke": { "value": "white", "width":0.5},

                    "fill": {
                        "field": "forsale_rate",
                        "type": "quantitative",
                        
                        "scale": {
                            "domain": [0, 0.07],
                            format:".1%",
                            "scheme": "reds"
                        },
                        "title": "For Sale Rate",
                        "legend": {"format": ".1%"}
                    
                    },
                    "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal" ,"title":"Suburb"}
                        , { "field": "forsale_rate", "type": "quantitative",format:".1%", "title": "For Sale Rate"}]

                }
            }


        ]



    }


    vegaEmbed("#map", map, {"actions":false});
}


function render_bar(house) {
    house = house.filter(d=>['SP','PN','S','SS','SN','SA'].includes( d.Method.slice(0,2 )))
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
        "width": 530,
        "height": 320,
        "data": { "values": data },
        "title":"Quarterly Growth of Median Housing Price in Greater Melbourne 2016-2018",


        "encoding": {
            "y": { "field": "quarter" , "title": "Quarter"},
            "x": {

                "field": "qoq",
                "type": "quantitative",
                "title": "qoq",
                "axis": { "format": ".2%" },
                "title": "Quarter over Quarter Growth"
            }

        },
        "layer": [
            { "mark": "bar" ,
        "encoding":{
            "fill": {
                                        "field": "qoq",
                                        "type": "quantitative",
                                        
                                        "scale": {
                                            "domain": [-0.18,0.09],
                                            format:".1%",
                                            "scheme": ["yellow", "#6D0028"]
                                        },
                                        "title":"quarterly growth rate",
                                        "legend": {"format": ".1%"}
                                        
                                    
                                    
        },
        "tooltip": [{"field": "quarter", "type":"nominal","title":"Quarter" },
                    {"field": "qoq","type":"quantitative","title":"Quarter Growth Rate","format":".1%"}]
    }},
            {
                "mark": {
                    "type": "text",
                    "align": "left",
                    "baseline": "middle",
                    "dx": 5,
                    "fontSize": 14
                },
                "encoding": {
                    "text": { "field": "qoq", "type": "quantitative", "format": ".2%" },
                    "tooltip": [{"field": "quarter", "type":"nominal","title":"Quarter" },
                    {"field": "qoq","type":"quantitative","title":"Quarter Growth Rate","format":".1%"}]
                }
            }
            
        ]
    }

    vegaEmbed("#bar", barjson,{"actions":false});

}



function render_bar_suburb(house) {
    house = house.filter(d=>['SP','PN','S','SS','SN','SA'].includes( d.Method.slice(0,2 )))
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
        "title":"Top Earning Suburbs in Greater Melbourne 2016-2018",
        "width": 650,
        "height": 440,
        "params": [
            {
                "name": "suburbRank", "value": 10,
                "bind": { "input": "range", "min": 0, "max": 50, "step": 1 ,
                "name": "Show Top: "}
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
                "sort": { "field": "cum_diff", "op": "sum", "order": "descending" },
                "title": "Suburbs"
            },
            "x": {

                "field": "cum_diff",
                "type": "quantitative",
                "title": "cum_diff",
                "axis": { "format": ".2%" },
                "title": "Median Housing Price Growth 2016-2018"

            }

        },
        "layer": [
            { "mark": "bar" ,
            "encoding":{
                "fill": {
                                            "field": "cum_diff",
                                            "type": "quantitative",
                                            
                                            "scale": {
                                                "domain": [0,1.3],
                                                format:".1%",
                                                "scheme": "reds"
                                            },
                                            "title":"total growth rate",
                                            "legend": {"format": ".1%"}
                                        },
                                        "tooltip": [{"field": "suburb", "type":"nominal","title":"Suburb" },
                                        {"field": "cum_diff","type":"quantitative","title":"Total Growth Rate","format":".1%"}]}},
            {
                "mark": {
                    "type": "text",
                    "align": "left",
                    "baseline": "middle",
                    "dx": 3,
                    "fontSize":13
                },
                "encoding": {
                    "text": { "field": "cum_diff", "type": "quantitative", "format": ".2%" },
                    "tooltip": [{"field": "suburb", "type":"nominal","title":"Suburb" },
                                        {"field": "cum_diff","type":"quantitative","title":"Total Growth Rate","format":".1%"}]
                }
            } 
        ]
    }

    vegaEmbed("#bar_suburb", barjson, {"actions":false});

}

// async function render_map_sales(house) {
//     house = d3.rollups(house, d => {
//         return {
//             for_sale: d.length,
//             sold_count: d.filter(d=>['SP','PN','S','SS','SN','SA'].includes( d.Method.slice(0,2 )  )).length
//         }
//     }, d => d.Suburb).map(d => {
//         return {
//             Suburb: d[0],
//             forsale_rate: (+d[1].sold_count) / d[1].for_sale 
//         }
//     })


//     let mapdata = await d3.json('vic.json')
//     let vic_data = topojson.feature(mapdata, mapdata.objects.vic)
//     let LOC_NAME_select = d3.groups(vic_data.features, d => d.properties.LOC_NAME).map(d => d[0])
//     let map = {
//         "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
//         "width": 1200,
//         "height": 600,
//         "title": "Sales of Residential Properties in Greater Melbourne 2016-2018",

//         "data": {
//             "values": vic_data,

//             "format": { "property": "features" }

//         },
//         "params": [{
//             "name": "LOC_NAME_select",
//             "bind": {
//             "input": "select",
//             "options": [null, ...LOC_NAME_select],
//             "labels": ["Show All", ...LOC_NAME_select],
//             "name":"Suburb Selection: "
//             }
//         },
//         {
//             "name": "zoom_level",
//             "value": 30000, //default scale
//             "bind": {
//               "input": "range",
//               "min": 10000,
//               "max": 100000,
//               "step": 150,
//               "name": "Zoom: "
//             }
//         },
//         {
//             "name": "center_to",
//             "value": [144.96,-37.8], //default centre central MEL
//             "bind": {
//               "input": "select",
//               "options": [
//                 [144.96,-37.8],
//                 [144.9, -37.66],
//                 [144.69,-37.62],
//                 [145.24, -37.83],
//                 [145.22, -37.94],
//                 [144.77, -37.79]
//               ],
//               "labels": ["Central Melbourne", "North Part", 
//               "North West", 
//               "East", "South East", "South West"],
//               "name": "Map Centre: "
//             }
//           }

//         ],
//         "transform": [

//             { "filter": "LOC_NAME_select == null || datum.properties.LOC_NAME == LOC_NAME_select" },

//             {
//                 "lookup": "properties.LOC_NAME",
//                 "from": {
//                     "data": { "values": house },
//                     "key": "Suburb",
//                     "fields": ["forsale_rate", 'Suburb']
//                 }
//             }],
//         "projection": {
//             "type": "mercator",
//             "center":{"expr": "center_to"},
//             "scale":{"expr": "zoom_level"}
        
        
//         },

//         "layer": [

//             {
//                 "mark": { "type": "geoshape" },
//                 "encoding": {
//                     "stroke": { "value": "gray", "width":2000},
//                     "fillOpacity": { "value": "0.1" },
//                     "title": "No data available",
//                         "legend": {"format": ".1%"}
//                 }

//             },
//             {

//                 "mark": { "type": "geoshape" },
//                 "encoding": {

//                     "stroke": { "value": "grey", "width":0.5},
//                     "fill": {
//                         "field": "forsale_rate",
//                         "type": "quantitative",
                        
//                         "scale": {
//                             "domain": [0, 0.5, 1.00],
//                             format:".1%",
//                             "scheme": ["yellow", "#6D0028"]
//                         },
//                         "title": "Conversion Rate",
//                         "legend": {"format": ".1%"}
                    
//                     },
//                     "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal" ,"title":"Suburb"}
//                         , { "field": "forsale_rate", "type": "quantitative",format:".1%", "title": "Conversion Rate"}]

//                 }
//             }


//         ]



//     }


//     vegaEmbed("#map_sales", map, {"actions":false});
// }


function render_housing_scatter(house) 
{
    house = house.filter(d=>['SP','PN','S','SS','SN','SA'].includes( d.Method.slice(0,2 )))
    
    let scatter =  {
    
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 720,
        "height": 500,
        "title": "Housing Price in Greater Melbourne 2016-2018",
        "data": 
        {
            "values": house
        },
        "params": 
        [
          {
            "name": "room_count_above",
            "value": 0,
            "bind": {
              "input": "range",
              "min": 0,
              "max": 12,
              "step": 1,
              "name": "Minimum No. of Rooms: "
            }
          },
          {
            "name": "room_count_below",
            "value": 12,
            "bind": {
              "input": "range",
              "min": 0,
              "max": 12,
              "step": 1,
              "name": "Maximum No. of Rooms: "
            }
          },
          {
            "name": "type_selection",
                      "bind": 
                      {
                        "input": "select",
                        "options": [
                          null,
                          "House",
                          "Townhouse",
                          "Unit"      
                        ],
                        "labels":[
                          "Show All",
                          "House (cottage, villa, semi, terrace inc.)",
                          "Townhouse",
                          "Unit (duplex inc.)"
                          
                        ],
                        "name": "Housing Type: "
            }
          }
        ],
        
        "transform": [
          {"filter": "datum.Distance > 0"},
          {"filter": "datum.Landsize > 0"},
          {"filter": "datum.Price > 0"},
          {"filter": "datum.Rooms >= room_count_above"},
          {"filter": "datum.Rooms <= room_count_below"},
          {"filter": "type_selection == null || datum.Type == type_selection"},
          {
            "calculate": "datum.Price/datum.Landsize",
            "as": "unit_price"
          },
          {"calculate": "{'t': 'Townhouse', 'h': 'House', 'u': 'Unit'}[datum.Type]", "as": "Type"}
        ],
        "encoding": {
          "x": {
            "field": "Distance",
            "type": "quantitative",
            "title": "Distance from Melbourne CBD in km",
            "axis": {"format": ","},
            "scale": {"type": "log", "domain": [0.5, 50.5]}
          },
          "y": {
            "field": "Price",
            "type": "quantitative",
            "axis": {"format":".1s"},
            "scale": {"type": "log", "domain": [110000, 13000000]}
            
          }
        },
        "layer": 
        [
            {
            "selection": {
              "type_highlight": {
                "type": "multi",
                "fields": ["Type"],
                "bind": "legend"
              }
            },
            "mark": "circle",
            "encoding": {
              "size": {
                "field": "Rooms",
                "type": "quantitative",
                "scale": {
                  "type": "threshold",
                  "domain": [2, 5, 7],
                  "range": [50, 150, 350, 700]
                },
                "legend": {"format": ".1s"}
              },
              "color": {
                "field": "Type",
                "type": "nominal",
                "scale": {
                  "domain": [
                    "House",
                    "Townhouse",
                    "Unit" 
                  ],
                  "range": [
                    "#d65047",         
                    "yellow",
                    "blue"
                  ]
                  
                },
            
                "title": "Housing Type"
              },
              "opacity": {
                "condition": {"selection": "type_highlight", "value": 0.6},
                "value": 0.2
              },
              "tooltip": [
                {"field": "Suburb", "type": "nominal"},
                {"field": "Type", "type": "nominal"},
                {"field": "Distance", "type": "quantitative", "format": ","},
                {"field": "unit_price", "type": "quantitative", "format": ".3s","title":"Unit Price"},
                {"field": "Price", "type": "quantitative", "format": ".3s"},
                {"field": "Rooms", "type": "quantitative", "format": ",","title":"Rooms"}
            
              ]
            }
        }
          
        ]
    }

vegaEmbed("#housing_scatter", scatter,{"actions":false})  
}



async function render_map_sales(house) {

    house = d3.rollups(house, d => {
        return {
            for_sale: d.length,
            sold_count: d.filter(d=>['SP','PN','S','SS','SN','SA'].includes( d.Method.slice(0,2 )  )).length
        }
    }, d => d.Suburb).map(d => {
        return {
            Suburb: d[0],
            sold_rate: (+d[1].sold_count) / d[1].for_sale 
        }
    })


    let mapdata = await d3.json('vic.json')
    let vic_data = topojson.feature(mapdata, mapdata.objects.vic)
    let LOC_NAME_select = d3.groups(vic_data.features, d => d.properties.LOC_NAME).map(d => d[0])
    let map = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 403,
        "height": 390,
        "title": "Housing Sold per Suburb in Greater Melbourne 2016-2018",

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
            "name":"Suburb Selection: "
            }
        },
        {
            "name": "zoom_level",
            "value": 17000, //default scale
            "bind": {
              "input": "range",
              "min": 10000,
              "max": 100000,
              "step": 150,
              "name": "Zoom: "
            }
        },
        {
            "name": "center_to",
            "value": [144.96,-37.8], //default centre central MEL
            "bind": {
              "input": "select",
              "options": [
                [144.96,-37.8],
                [144.9, -37.66],
                [144.69,-37.62],
                [145.24, -37.83],
                [145.22, -37.94],
                [144.77, -37.79]
              ],
              "labels": ["Central Melbourne", "North Part", 
              "North West", 
              "East", "South East", "South West"],
              "name": "Map Centre: "
            }
          }

        ],
        "transform": [

            { "filter": "LOC_NAME_select == null || datum.properties.LOC_NAME == LOC_NAME_select" },

            {
                "lookup": "properties.LOC_NAME",
                "from": {
                    "data": { "values": house },
                    "key": "Suburb",
                    "fields": ["sold_rate", 'Suburb']
                }
            }],
        "projection": {
            "type": "mercator",
            "center":{"expr": "center_to"},
            "scale":{"expr": "zoom_level"}
        
        
        },

        "layer": [

            {
                "mark": { "type": "geoshape" },
                "encoding": {
                    "stroke": { "value": "gray" },
                    "fillOpacity": { "value": "0.1" },
                    "tooltip":[{"field":"properties.LOC_NAME", "type":"nominal", "title":"Suburb"},
            {"field":"sold_rate", "title":"Conversion Rate"}]
                }

            },
            {

                "mark": { "type": "geoshape" },
                "encoding": {
                    "stroke": { "value": "white", "width":0.5},

                    "fill": {
                        "field": "sold_rate",
                        "type": "quantitative",
                        
                        "scale": {
                            "domain": [0, 0.5, 1.00],
                            format:".1%",
                            "scheme": ["yellow", "#6D0028"]
                        },
                        "title": "Conversion Rate",
                        "legend": {"format": ".1%"}
                    
                    },
                    "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal" ,"title":"Suburb"}
                        , { "field": "sold_rate", "type": "quantitative",format:".1%", "title": "Conversion Rate"}]

                }
            }


        ]



    }


    vegaEmbed("#map_sales", map, {"actions":false});
}




// async function render_map_growth(house) {
//     house = house.filter(d=>['SP','PN','S','SS','SN','SA'].includes( d.Method.slice(0,2 )))
//     // house = d3.rollups(house, d => {
//     //     return {
//     //         for_sale: d.length, //no. of properties for sale
//     //         Propertycount: d3.max(d, v => v.Propertycount) //total in the suburb
//     //     }
//     // }, d => d.Suburb).map(d => {
//     //     return {
//     //         Suburb: d[0],
//     //         forsale_rate: d[1].for_sale / (+d[1].Propertycount) 
//     //     }
//     // })

    
//     let Qy = d3.timeParse('%e/%m/%Y')
//     house.sort((a, b) => Qy(a.Date) > Qy(b.Date) ? 1 : -1)
//     let bar_data = d3.rollups(house, d => d3.median(d, v => v.Price), d => d.Suburb, d => d3.timeFormat('%Y-Q%q')(new Date(d.Date)))
//     bar_data.forEach(item => {

//         item[1].forEach((d, i, arr) => {
//             if (i) {
//                 d[2] = (d[1] - arr[i - 1][1]) / (d[1] ? d[1] : 1)
//             } else {
//                 d[2] = 0
//             }
//         })

//         item[2] = d3.sum(item[1], d => d[2])
//     })

//     let data = bar_data.map(d => {
//         return {
//             suburb: d[0],
//             detail: d[1],
//             cum_diff: d[2]
//         }
//     })

//     let mapdata = await d3.json('vic.json')
//     let vic_data = topojson.feature(mapdata, mapdata.objects.vic)
//     let LOC_NAME_select = d3.groups(vic_data.features, d => d.properties.LOC_NAME).map(d => d[0])
//     let map = {
//         "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
//         "width": 800,
//         "height": 600,
//         "title": "Residential Properties For Sale in each Suburb in Greater Melbourne 2016-2018",

//         "data": {
//             "values": vic_data,

//             "format": { "property": "features" }

//         },
//         "params": [{
//             "name": "LOC_NAME_select",
//             "bind": {
//             "input": "select",
//             "options": [null, ...LOC_NAME_select],
//             "labels": ["Show All", ...LOC_NAME_select],
//             "name":"Suburb Selection: "
//             }
//         },
//         {
//             "name": "zoom_level",
//             "value": 30000, //default scale
//             "bind": {
//               "input": "range",
//               "min": 10000,
//               "max": 100000,
//               "step": 150,
//               "name": "Zoom: "
//             }
//         },
//         {
//             "name": "center_to",
//             "value": [144.96,-37.8], //default centre central MEL
//             "bind": {
//               "input": "select",
//               "options": [
//                 [144.96,-37.8],
//                 [144.9, -37.66],
//                 [144.69,-37.62],
//                 [145.24, -37.83],
//                 [145.22, -37.94],
//                 [144.77, -37.79]
//               ],
//               "labels": ["Central Melbourne", "North Part", 
//               "North West", 
//               "East", "South East", "South West"],
//               "name": "Map Centre: "
//             }
//           }

//         ],
//         "transform": [
    

//             { "filter": "LOC_NAME_select == null || datum.properties.LOC_NAME == LOC_NAME_select" },
            

//             {
//                 "lookup": "properties.LOC_NAME",
//                 "from": {
//                     "data": { "values": data },
//                     "key": "suburb",
//                     "fields": ["detail", 'suburb']
//                 }
//             }],
//         "projection": {
//             "type": "mercator",
//             "center":{"expr": "center_to"},
//             "scale":{"expr": "zoom_level"}
        
        
//         },

//         "layer": [

//             {
//                 "mark": { "type": "geoshape" },
//                 "encoding": {
//                     "stroke": { "value": "gray" },
//                     "fillOpacity": { "value": "0.1" }
//                 }

//             },
//             {

//                 "mark": { "type": "geoshape" },
//                 "encoding": {
//                     "stroke": { "value": "white", "width":0.5},

//                     "fill": {
//                         "field": "detail",
//                         "type": "quantitative",
                        
//                         "scale": {
//                             "domain": [-1000000, 1000000],
//                             format:",",
//                             "scheme": ["yellow","red"]
//                         },
//                         "title": "Growth Rate",
//                         "legend": {"format": ","}
                    
//                     },
//                     "tooltip": [{ "field": "properties.LOC_NAME", "type": "norminal" ,"title":"Suburb"}
//                         , { "field": "detail", "type": "quantitative", "title": "Growth Rate"}]

//                 }
//             }


//         ]



//     }


//     vegaEmbed("#map_growth", map, {"actions":false});
// }