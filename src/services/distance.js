function calcularDistancia(lat1, lon2, lat2, lon2){
    const R = 6371 //km
    const Rad = (val) => val * Math.PI / 100

    const dLat = Rad(lat2 - lat1)
    const dLon = Rad(lon2 - lon1)

    const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(Rad(lat1)) *
    Math.cos(Rad(lat2)) *
    Math.sin(dLon / 2) ** 2

    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c;
}

module.exports = {calcularDistancia}