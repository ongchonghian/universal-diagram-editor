/**
 * Sample datasets for Vega/Vega-Lite Editor
 */

export const SAMPLE_DATASETS = [
    {
        id: 'cars',
        label: 'Cars',
        description: 'Automotive data with mpg, cylinders, horsepower, etc.',
        icon: 'fas fa-car',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/cars.json',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "description": "A scatterplot showing horsepower and miles per gallons for various cars.",
            "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/cars.json" },
            "mark": "point",
            "encoding": {
                "x": { "field": "Horsepower", "type": "quantitative" },
                "y": { "field": "Miles_per_Gallon", "type": "quantitative" },
                "color": { "field": "Origin", "type": "nominal" },
                "tooltip": [
                    { "field": "Name", "type": "nominal" },
                    { "field": "Year", "type": "temporal", "timeUnit": "year" }
                ]
            }
        }
    },
    {
        id: 'weather',
        label: 'Seattle Weather',
        description: 'Weather data including precipitation, temp, and wind.',
        icon: 'fas fa-cloud-sun-rain',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/seattle-weather.json',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/seattle-weather.json" },
            "mark": "bar",
            "encoding": {
                "x": { "timeUnit": "month", "field": "date", "type": "ordinal" },
                "y": { "aggregate": "mean", "field": "precipitation" },
                "color": { "field": "weather" }
            }
        }
    },
    {
        id: 'barley',
        label: 'Barley Yield',
        description: 'Agricultural yield data across sites and years.',
        icon: 'fas fa-seedling',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/barley.json',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/barley.json" },
            "mark": "point",
            "encoding": {
                "x": { "field": "yield", "type": "quantitative", "scale": { "zero": false } },
                "y": { "field": "variety", "type": "ordinal" },
                "color": { "field": "year", "type": "nominal" },
                "facet": { "column": { "field": "site", "type": "ordinal" } }
            }
        }
    },
    {
        id: 'movies',
        label: 'Movies',
        description: 'Film data containing ratings, genres, and box office info.',
        icon: 'fas fa-film',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/movies.json',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/movies.json" },
            "mark": "bar",
            "encoding": {
                "x": { "bin": true, "field": "IMDB_Rating" },
                "y": { "aggregate": "count" }
            }
        }
    },
    {
        id: 'stocks',
        label: 'Stocks',
        description: 'Stock prices of major tech companies over time.',
        icon: 'fas fa-chart-line',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/stocks.csv',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/stocks.csv" },
            "mark": "line",
            "encoding": {
                "x": { "field": "date", "type": "temporal" },
                "y": { "field": "price", "type": "quantitative" },
                "color": { "field": "symbol", "type": "nominal" }
            }
        }
    },
    {
        id: 'airports',
        label: 'US Airports',
        description: 'Map of airports across the United States.',
        icon: 'fas fa-plane',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/airports.csv',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "width": 800,
            "height": 500,
            "projection": { "type": "albersUsa" },
            "layer": [
                {
                    "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/us-10m.json", "format": { "type": "topojson", "feature": "states" } },
                    "mark": { "type": "geoshape", "fill": "lightgray", "stroke": "white" }
                },
                {
                    "data": { "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/airports.csv" },
                    "mark": { "type": "circle", "color": "steelblue", "opacity": 0.6 },
                    "encoding": {
                        "longitude": { "field": "longitude", "type": "quantitative" },
                        "latitude": { "field": "latitude", "type": "quantitative" },
                        "size": { "value": 10 }
                    }
                }
            ]
        }
    },
    {
        id: 'unemployment',
        label: 'US Unemployment',
        description: 'Choropleth map of US unemployment rates by county.',
        icon: 'fas fa-map-marked-alt',
        url: 'https://cdn.jsdelivr.net/npm/vega-datasets@2/data/unemployment-across-industries.json',
        spec: {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "width": 800,
            "height": 500,
            "projection": { "type": "albersUsa" },
            "data": {
                "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/us-10m.json",
                "format": {
                    "type": "topojson",
                    "feature": "counties"
                }
            },
            "transform": [{
                "lookup": "id",
                "from": {
                    "data": {
                        "url": "https://cdn.jsdelivr.net/npm/vega-datasets@2/data/unemployment.tsv"
                    },
                    "key": "id",
                    "fields": ["rate"]
                }
            }],
            "mark": "geoshape",
            "encoding": {
                "color": {
                    "field": "rate",
                    "type": "quantitative"
                }
            }
        }
    }
];
