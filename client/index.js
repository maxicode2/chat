import { EmojiButton } from "./emoji-button.js"

twemoji.base = "twemoji/"

let socket = io()

let loginModal = document.getElementById("login-modal")
let login = document.getElementById("login")
let loginName = document.getElementById("login-name")
let loginInvalid = document.getElementById("login-invalid")

const nameRegex = /^[a-zA-Z0-9\-_]{1,16}$/

login.onsubmit = (e) => {
    e.preventDefault()

    if(!nameRegex.test(loginName.value)) {
        loginInvalid.removeAttribute("hidden")
        loginName.select()
        return
    }

    socket.once("success", () => {
        socket.on("message", (message) => {
            addMessage(JSON.parse(message))
        })
        loginModal.remove()
    })
    socket.once("bad_name", () => {
        loginInvalid.removeAttribute("hidden")
        loginName.select()
        socket = io()
    })
    socket.emit("hello", loginName.value)
}


function sanitize(text) {
    return text.replace("&", "&amp").replace("<", "&lt").replace(">", "&gt").replace('"', "&quot").replace("'", "&#x27")
}

let messageScroll = document.getElementById("messages-scroll")
let messageContainer = document.getElementById("messages")

function addMessage(message) {
    let scroll = messageScroll.scrollHeight - messageScroll.scrollTop === messageScroll.clientHeight

    let e = document.createElement("div")
    e.classList.add("message")

    if(!message.system) {
        let user = document.createElement("div")
        user.classList.add("user")
        e.appendChild(user)
    
        let username = document.createElement("div")
        username.classList.add("username")
        username.innerText = message.user
        user.appendChild(username)
    }

    let content = document.createElement("div")
    content.classList.add("content")
    let msg = sanitize(message.message).replaceAll(/(https?:\/\/..+)/g, '<a class="url" href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    if(message.system) {
        content.classList.add("system")
        content.innerHTML = msg
            .replaceAll(/\*\*(.*)\*\*/g, '<span class="bold">$1</span>')
            .replaceAll(/\*(.*)\*/g, '<span class="italic">$1</span>')
            .replaceAll(/__(.*)__/g, '<span class="underline">$1</span>')
            .replaceAll(/~~(.*)~~/g, '<span class="strikethrough">$1</span>')
    }
    else content.innerHTML = msg
    twemoji.parse(content)
    e.appendChild(content)

    console.log(message)

    messageContainer.appendChild(e)

    if(scroll) messageScroll.scrollTo({top: messageScroll.scrollHeight, behavior: "smooth"})
}

let input = document.getElementById("input")
let form = document.getElementById("message-form")

function getInputValue() {
    let message = ""
    for(let e of document.querySelector("#input").childNodes) {
        if(e.nodeName === "#text") message += e.textContent
        else if(e.nodeName === "IMG" && e.classList.contains("emoji")) message += e.alt
    }
    return message
}

function submitMessage(e) {
    e.preventDefault()

    if(!input.hasChildNodes) return

    
    socket.emit("message", getInputValue().trim())
    input.innerText = ""
}
input.onkeydown = (e) => {
    if(e.keyCode === 13) {
        e.preventDefault()
        submitMessage({preventDefault:()=>{}})
    }
    if(e.keyCode === 27) {
        e.preventDefault()
        input.blur()
    }
}
new MutationObserver(() => {
    twemoji.parse(input)
}).observe(input, {
    attributes: false,
    characterData: true,
    childList: true,
    subtree: true
})
form.onsubmit = submitMessage

window.contenteditableMaxLength({
    element: input,
    maxLength: 256
})

let trigger = document.getElementById("emoji-trigger")
twemoji.parse(trigger)
let picker = new EmojiButton({
    style: "twemoji"
})
let pickerModal = document.getElementsByClassName("emoji-picker__wrapper")[0]
new MutationObserver(() => {
    if(pickerModal.style.display === "none") {
        input.focus()
        console.log(input.lastChild)
        let range = document.createRange()
        range.setStartAfter(input.lastChild, 0)
        range.setEndAfter(input.lastChild, 0)
        
        let selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
    }
}).observe(pickerModal, {attributes: true})

picker.on("emoji", (selection) => {
    input.innerHTML += selection.emoji
    twemoji.parse(input)
})

trigger.addEventListener("click", () => {
    picker.togglePicker(trigger)
})