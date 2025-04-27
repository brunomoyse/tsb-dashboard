<template>
    <!-- the map container -->
    <div ref="mapTarget" class="w-full h-full"></div>
</template>

<script setup lang="ts">
// bring in the default OL CSS
import 'ol/ol.css'

// Vue & GraphQL
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { print } from 'graphql'
import gql from 'graphql-tag'
import { useGqlSubscription } from '~/composables/useGqlSubscription' // adjust path

// OpenLayers imports
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Style from 'ol/style/Style'
import CircleStyle from 'ol/style/Circle'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import { easeOut } from 'ol/easing'
import { fromLonLat } from 'ol/proj'

const imei = '123456789012345'

/* ------------------------------------------------------------------ */
/* 1. GraphQL subscription                                            */
/* ------------------------------------------------------------------ */
interface PositionPayload {
    positionUpdated: {
        longitude: number
        latitude: number
        timestamp: string
    }
}

const { data: posSub, stop: stopPosSub } = useGqlSubscription<PositionPayload>(
    print(gql`
    subscription ($imei: String!) {
      positionUpdated(deviceImei: $imei) {
        longitude
        latitude
        timestamp
      }
    }
  `),
    { imei }
)

/* ------------------------------------------------------------------ */
/* 2. OpenLayers map setup                                            */
/* ------------------------------------------------------------------ */
const mapTarget = ref<HTMLElement | null>(null)
let map: Map | null = null
let marker: Feature<Point> | null = null

function initMap() {
    if (!import.meta.client || !mapTarget.value) return

    // create a vector layer to hold our single marker
    const vectorSource = new VectorSource()
    const vectorLayer = new VectorLayer({ source: vectorSource })

    map = new Map({
        target: mapTarget.value,
        layers: [
            new TileLayer({ source: new OSM() }),
            vectorLayer
        ],
        view: new View({
            // centre on Vilnius
            center: fromLonLat([25.27965, 54.68716]),
            zoom: 14
        })
    })

    // one feature, initial coords don't matter
    marker = new Feature({
        geometry: new Point(fromLonLat([0, 0]))
    })
    // style it as a 8px red circle with white border
    marker.setStyle(new Style({
        image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: 'red' }),
            stroke: new Stroke({ color: 'white', width: 2 })
        })
    }))
    vectorSource.addFeature(marker)
}

/* ------------------------------------------------------------------ */
/* 3. Update marker on new data                                       */
/* ------------------------------------------------------------------ */
function updatePosition(lon: number, lat: number) {
    if (!map || !marker) return

    // project into WebMercator
    const newCoord = fromLonLat([lon, lat])
    const geom = marker.getGeometry() as Point
    const oldCoord = geom.getCoordinates()

    // number of animation steps (e.g. 60 frames)
    const steps = 60
    let i = 0

    // per-frame delta
    const dx = (newCoord[0] - oldCoord[0]) / steps
    const dy = (newCoord[1] - oldCoord[1]) / steps

    // animate the marker geometry
    function animateMarker() {
        if (i < steps) {
            const x = oldCoord[0] + dx * i
            const y = oldCoord[1] + dy * i
            geom.setCoordinates([x, y])
            i++
            requestAnimationFrame(animateMarker)
        } else {
            // ensure we finish exactly on newCoord
            geom.setCoordinates(newCoord)
        }
    }

    // kick off both animations together
    animateMarker()
    map.getView().animate({
        center: newCoord,
        duration: 1000,
        easing: easeOut
    })
}
watch(
    () => posSub.value,
    (payload) => {
        const pos = payload?.positionUpdated
        if (pos) updatePosition(pos.longitude, pos.latitude)
    }
)

/* ------------------------------------------------------------------ */
/* 4. Lifecycle hooks                                                 */
/* ------------------------------------------------------------------ */
onMounted(initMap)

onBeforeUnmount(() => {
    stopPosSub()
    if (map) {
        map.setTarget(undefined)
        map = null
        marker = null
    }
})
</script>

<style scoped>
/* make sure the map fills its parent */
div {
    width: 100%;
    height: 100%;
}
</style>
