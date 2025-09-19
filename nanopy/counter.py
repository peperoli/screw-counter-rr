# Constants
const PIR_PIN = C_PIN_05        # PIR sensor on IN06
const IDLE = 0
const READY = 1
const COUNTING = 2
const SUCCESS = 3

# Init sensor and counter
initGPIO(PIR_PIN, INPUT)        # PIR is an input
state = IDLE
counter = 0
countTarget = 0

# MQTT credentials
uri = "mqtts://761aa76a827b4185897045398392da71.s1.eu.hivemq.cloud:8883"
username = "oxocard"
password = "Dfr4mZ5C04cV"

# Connect to MQTT broker
isConnectedToMQTT = connectMQTT(uri, username, password)

def drawInitialUI():
    clear()
    textFont(FONT_ROBOTO_BOLD_32)
    drawText(16, 16, "Screw Counter")
    textFont(FONT_ROBOTO_24)
    drawText(16, 48, "Idle")
    update()
    
def drawReadyUI():
    clear()
    textFont(FONT_ROBOTO_BOLD_32)
    drawText(16, 16, "Screw Counter")
    textFont(FONT_ROBOTO_24)
    drawText(16, 48, "Ready")
    drawText(16, 96, "Press start")
    update()

def drawCountingUI():
    clear()
    textFont(FONT_ROBOTO_BOLD_32)
    drawText(16, 16, "Screw Counter")
    textFont(FONT_ROBOTO_24)
    drawText(16, 48, "Counting")
    textFont(FONT_ROBOTO_BOLD_48)
    drawText(16, 72, counter)
    textFont(FONT_ROBOTO_BOLD_24)
    drawText(16, 128, "count target:" + countTarget)
    update()

def drawSuccessUI():
    clear()
    textFont(FONT_ROBOTO_BOLD_32)
    drawText(16, 16, "Screw Counter")
    textFont(FONT_ROBOTO_24)
    drawText(16, 48, "Success")
    drawText(16, 96, "Restart?")
    update()

def establishMQTTConnection()->int:
    if connectMQTT(uri, username, 0):
        return 1
    else:
        drawText(16, 72, "MQTT connect failed")
        update()
        return 0

def bytesToInt(payload:byte[1024])->int:
    result = 0
    # b is the ascii code, so we have to subtract 48 to get the digit
    for b in payload:
        if b == 0
            break 
        result = result * 10 + (b - 48)
    return result

while state == IDLE:
	drawInitialUI()

    if establishMQTTConnection()
        state = READY

while state == READY:
    drawReadyUI()
	buttonByte = getButton()

    # Subscribe to MQTT topic
    subscribeMQTT("count-target")
    subscribeMQTT("reset")
    textFont(FONT_ROBOTO_24)
    drawText(16, 72, "MQTT ready")
    update()

    if hasMQTTMessage():
        topic = getMQTTTopic()
        payload = getMQTTData()
        # topic starts with c (ascii 99)
        if topic[0] == 99 && payload[0]:
            countTarget = bytesToInt(payload)
            state = COUNTING

	if buttonByte > 0:
		if buttonByte == 4:
			returnToMenu()
			break
		state = COUNTING

while state == COUNTING:
    isHigh = readGPIO(PIR_PIN)

	if hasMQTTMessage():
        topic = getMQTTTopic()
        # topic starts with r (ascii 114)
        if topic[0] == 114
            state = READY

    if counter == 0:
        drawCountingUI()

    # Count when the sensor is low
	if not isHigh:
        counter += 1
        drawCountingUI()
        publishMQTT("current-count", counter)

        if counter == countTarget:
            counter = 0
            countTarget = 0
        	publishMQTT("success", counter)
            state = SUCCESS

        delay(500)

while state == SUCCESS:
    drawSuccessUI()
    buttonByte = getButton()

	if hasMQTTMessage():
        topic = getMQTTTopic()
        # topic starts with r (ascii 114)
        if topic[0] == 114
            state = READY

	if buttonByte > 0:
		if buttonByte == 4:
			returnToMenu()
			break
		state = IDLE

