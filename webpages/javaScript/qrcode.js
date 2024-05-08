let seconds = 25

const interval = setInterval(() => {
    if (seconds > 0) changeDocument({ header2: `Remaining time: ${--seconds}s` })
    else changeDocument({
        image: "images/refresh.jpg",
        header1: "QR expired",
        header2: " ",
        description: "The QR code has expired. Please refresh this page to generate a new code.",
        bgColor: "#44A2FF",
        clearInterval: true
    })
}, 1000)

function changeDocument(docs) {
    if (docs.image) document.getElementById("image").src = docs.image
    if (docs.header1) document.getElementById("header1").innerHTML = docs.header1
    if (docs.header2) document.getElementById("header2").innerHTML = docs.header2
    if (docs.description) document.getElementById("description").innerHTML = docs.description
    if (docs.bgColor) document.body.style.background = docs.bgColor
    if (docs.clearInterval) clearInterval(interval)
}