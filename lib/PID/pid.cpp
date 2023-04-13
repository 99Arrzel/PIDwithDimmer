#include <algorithm>
#include <Arduino.h>
/* Consts */
float kp = 1.0;
float ki = 0.1;
float kd = 0.5;
/* ====== */
float lastError = 0.0;
float error = 0.0;
float integral = 0.0;
float derivative = 0.0;
float maxIntegral = 0.2;
unsigned long lastTime = 0;
float sampleTime = 0.250;

void controllerTemperature(float setpoint, float current, float &heater, float &cooler)
{
    /* Calculate */
    error = setpoint - current;     // Error (Proportional)
    integral += error * sampleTime; // Integral
    if (integral > maxIntegral)
        integral = maxIntegral;
    derivative = (error - lastError) / sampleTime; // Derivative
    float output = kp * error + ki * integral + kd * derivative;
    if (output > 0)
    {
        heater = min(100.0, static_cast<double>(output)) / 100.0; // Limit the output to the range [0, 100]
        cooler = 0;
    }
    if (output < 0)
    {
        heater = 0;
        cooler = min(100.0, static_cast<double>(-output)) / 100.0; // Make the output positive and limit to [0, 100]
    }
    lastError = error;
    float deltaTime = (millis() - lastTime) / 1000.0;
    sampleTime = max(0.1, 2.0 * deltaTime); // Limit the minimum sample time to 0.1 seconds
    lastTime = millis();
}