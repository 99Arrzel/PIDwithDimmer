#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include "pid.cpp"
#include "max6675.h"
/* Interfaz Values */
bool override = false;
float readedTemp = 0.0;
float setpoint = 25.0; // Setpoint 25ºC
float offset = 0.0;
const char *ssid = "unoalocho";
const char *password = "12345678";
// Temperatures 0-100%
float heater = 0.0; // Heater is a percentage of 8192 in 0 to 1
float cooler = 0.0; // Cooler is a percentage of 255 in 0 to 1

/* ============== */
/* Termocuple */
int thermoDO = 19;
int thermoCS = 23;
int thermoCLK = 5;
MAX6675 thermocouple(thermoCLK, thermoCS, thermoDO);
/* ========= */
/* Dimmer vals TODO: Fix someday to light one up, then light the other*/
const int triacPin = 25;
const int triacPin2 = 26;
const int zeroCrossPin = 35;
const int timingFactor = 1;
const int firingTime = 12;
volatile int fadeLevel = 0; // Fade level 0-8192
// volatile int fadeLevel2 = 0; // Fade level 0-8192
void zeroCross()
{
  if (fadeLevel > 0)
  {
    int offTime = timingFactor * (8192 - fadeLevel);
    delayMicroseconds(offTime);
    digitalWrite(triacPin, HIGH);
    digitalWrite(triacPin2, HIGH);
    delayMicroseconds(firingTime);
    digitalWrite(triacPin, LOW);
    digitalWrite(triacPin2, LOW);
  }
}
/* ================================================================ */
/* Fan PWM Control */
const int FAN_PIN = 32;
const int TACH_PIN = 33;
// Fan settings
const int PWM_FREQ = 40000;
const int PWM_CHANNEL = 0;
const int PWM_RESOLUTION = 10;
// Variables
volatile unsigned long tachCount = 0;
unsigned long lastTimeC = 0;
void IRAM_ATTR isrTachometer()
{
  tachCount++;
}
float logRpm()
{
  static float rpm = 0;
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - lastTimeC;
  if (elapsedTime >= 100) // Allow 100 ms to pass before calculating RPM again
  {
    rpm = (tachCount / (elapsedTime / 1000.0)) * 60.0 / 2.0;
    tachCount = 0;
    lastTimeC = currentTime;
  }
  return rpm;
}
/* ================================================================ */
/* WebSocketServer */
WebSocketsServer webSocket(81);
void handleWebSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length)
{
  Serial.print("Received from client: ");
  if (type == WStype_TEXT)
  {
    Serial.println((char *)payload);
    String message = (char *)payload;
    String mtype = message.substring(0, 3);
    float value = atof(message.substring(4).c_str());
    if (mtype == "set")
    {
      setpoint = value;
    }
    if (mtype == "off")
    {
      offset = value;
    }
    if (mtype == "kpv")
    {
      kp = value;
    }
    if (mtype == "kiv")
    {
      ki = value;
    }
    if (mtype == "kdv")
    {
      kd = value;
    }
    if (mtype == "ilv")
    {
      maxIntegral = value;
    }
    if (mtype == "ovr")
    {
      override = value;
    }
    if (mtype == "htr")
    {
      heater = value;
    }
    if (mtype == "clr")
    {
      cooler = value;
    }
  }
}

void setup()
{
  Serial.begin(115200);
  /* Wifi */
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.println("Connecting to WiFi..");
  }
  Serial.println("Connected to the WiFi network");
  /* ==== */
  /* Websocket */
  webSocket.begin();
  webSocket.onEvent(handleWebSocketEvent);
  /* ======== */
  /* Dimmer */
  pinMode(triacPin, OUTPUT);
  pinMode(triacPin2, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(zeroCrossPin), zeroCross, RISING);
  /* ====== */
  /* PWM FAN */
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(FAN_PIN, PWM_CHANNEL);
  pinMode(TACH_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(TACH_PIN), isrTachometer, FALLING);
  /* ====== */
}

void loop()
{
  webSocket.loop();
  if (thermocouple.readCelsius() != NAN) // No nan shit
  {
    readedTemp = thermocouple.readCelsius() + offset;
  }
  if (override == false)
  {
    controllerTemperature(setpoint, readedTemp, heater, cooler);
  }
  fadeLevel = round(8192 * heater);
  ledcWrite(PWM_CHANNEL, round(255 * cooler));

  webSocket.broadcastTXT(
      "SetPoint:" + String(setpoint) +
      "|Offset:" + String(offset) +
      "|Cooler:" + String(cooler) +
      "|Heater:" + String(heater) +
      "|Kp:" + String(kp) +
      "|Ki:" + String(ki) +
      "|Kd:" + String(kd) +
      "|I_Limit:" + String(maxIntegral) +
      "|Error:" + String(error) +
      "|P_term:" + String(error) +
      "|I_Term:" + String(integral) +
      "|D_Term:" + String(derivative) +
      "|Override_Status:" + String(override) +
      "|ActualTemp:" + String(readedTemp));
  delay(250);
}