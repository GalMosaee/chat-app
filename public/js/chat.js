//Create a io connection. The io() supplied from /socket.io/socket.io.js.
const socket = io()

//Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#lcation-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options
const {username,room} = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = ()=>{
    //New message element
    const $newMessage = $messages.lastElementChild
    //Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    //Visible height
    const visibleHeight = $messages.offsetHeight
    //Height of messages container
    const containerHeight = $messages.scrollHeight
    //How far have i scrolledS
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight-newMessageHeight <= scrollOffset){
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message',(message)=>{
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend',html)
    autoscroll()
})

socket.on('locationMessage',(message)=>{
    console.log(message)
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend',html)
    autoscroll()
})

socket.on('roomData',({room,users})=>{
    const html = Mustache.render(sidebarTemplate,{
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit',(e)=>{
    //This prevent refresh after every submition.
    e.preventDefault()
    //Disables the form when it's submitting.
    $messageFormButton.setAttribute('disabled','disabled')
    const message = e.target.elements.message.value
    socket.emit('sendMessage',message,(error)=>{
        //Re-enables the form after submition finished.
        $messageFormButton.removeAttribute('disabled')
        //Clear the input content.
        $messageFormInput.value = ''
        //Focus on form input.
        $messageFormInput.focus()
        if(error){
            return console.log(error)
        }
        console.log('Message delivered!')
    })
})

$sendLocationButton.addEventListener('click',()=>{
    if(!navigator.geolocation){
        return alert('Geolocation is not supported by your browser.')
    }
    //Disables the button when it's submitting.
    $sendLocationButton.setAttribute('disabled','disabled')
    navigator.geolocation.getCurrentPosition((position)=>{
        socket.emit('sendLocation',{
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        },()=>{
            //Re-enables the button after submition finished.
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location shared!')
        })
    })
})

socket.emit('join', {username, room},(error)=>{
    if(error){
        alert(error)
        location.href = '/'
    }
})