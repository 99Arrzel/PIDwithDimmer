import { useRef, useState } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { InputNumber } from 'primereact/inputnumber';
import Plot from 'react-plotly.js';
function throttle<T extends (...args: any[]) => any>(func: T, interval: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const throttledFunc = function (this: any, ...args: any[]) {
    if (!timeoutId) {
      // call the function immediately if timeoutId is not set
      func.apply(this, args);
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
      }, interval);
    }
  };

  return throttledFunc as T;
}
function webSocketConnection(url: string) {
  const ws = new WebSocket(url);
  return ws;
}

function App() {



  const [data, setData] = useState({
    x: [] as Date[],
    y: [] as number[],
  });

  const [url, setUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  /* Usestate para SetPoint, Offset, Cooler, Heater, Kp, Ki, Kd, I_Limit, Error, P_term, I_Term, D_Term, Override_Status, ActualTemp*/
  const [setPoint, setSetPoint] = useState(0);
  const [offset, setOffset] = useState(0);

  const [overrideStatus, setOverrideStatus] = useState(0);
  const [cooler, setCooler] = useState(0);
  const [heater, setHeater] = useState(0);
  const [kp, setKp] = useState(0);
  const [ki, setKi] = useState(0);
  const [kd, setKd] = useState(0);
  const [iLimit, setILimit] = useState(0);
  /* Only read */
  const [error, setError] = useState(0);
  const [pTerm, setPTerm] = useState(0);
  const [iTerm, setITerm] = useState(0);
  const [dTerm, setDTerm] = useState(0);
  const [actualTemp, setActualTemp] = useState(0);
  const tryConnection = () => {
    try {
      const ws = webSocketConnection("ws://" + url);
      setWs(ws);
      ws.onopen = () => {
        console.log("Connected");
        setConnected(true);
      };
      ws.onclose = () => {
        console.log("Disconnected");
        setConnected(false);
      };

      ws.onmessage = (event) => {
        const SetData = event.data as string;
        console.log(SetData);

        SetData.split("|").forEach((element) => {
          const [key, value] = element.split(":");
          switch (key) {
            case "Setpoint":
              setSetPoint(Number(value));
              break;
            case "Offset":
              setOffset(Number(value));
              break;
            case "Cooler":
              setCooler(Number(value));
              break;
            case "Heater":

              setHeater(Number(value));
              break;
            case "Override_status":
              setOverrideStatus(Number(value));
              break;
            case "Kp":
              setKp(Number(value));
              break;
            case "Ki":
              setKi(Number(value));
              break;
            case "Kd":
              setKd(Number(value));
              break;
            case "I_limit":
              setILimit(Number(value));
              break;
            case "Error":
              setError(Number(value));
              break;
            case "P_term":
              setPTerm(Number(value));
              break;
            case "I_term":
              setITerm(Number(value));
              break;
            case "D_term":
              setDTerm(Number(value));
              break;
            case "Actualtemp":
              setActualTemp(Number(value));
              setData((prev) => {
                const newData = {
                  x: [...prev.x, new Date()],
                  y: [...prev.y, Number(value)],
                };
                if (newData.x.length > 2000) {
                  newData.x.shift();
                  newData.y.shift();
                }
                return newData;
              });
              break;
            default:
              break;
          }
        });
      };
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className='flex bg-green-500  h-full w-full justify-center '>
      <div>
        <h1 className='text-center text-2xl text-white'>Temp Controller</h1>
        <div className='flex gap-2'>
          <h2 className='text-xl self-center'>IP: </h2>
          <div>
            <input className='border-2  rounded-tl-lg  p-2 rounded-bl-lg' type="text" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className='border-2 bg-white p-2  rounded-tr-lg rounded-br-lg' onClick={tryConnection}>Connect</button>
          </div>
        </div>
        {ws && connected && <h1>Connected</h1>}
        {ws && !connected && <h1>Connecting...</h1>}
        {!ws && <h1>Not Connected</h1>}
        <div className='grid grid-cols-2 gap-2'>
          <div className='flex'>
            <div className='bg-yellow-200 p-4'>
              <h2 className='text-center'>¿Override controls?</h2>
              <div className='flex justify-center'>
                <InputSwitch checked={overrideStatus === 1} onChange={(e) => ws?.send("ovr:" + (e.value ? 1 : 0))} />
              </div>
              <div className="flex-auto">
                <label htmlFor="heater" className="block ">Heater</label>
                <InputNumber disabled={overrideStatus === 0} inputId="heater" value={heater * 100} onValueChange={(e) => ws?.send("htr:" + (e.value as number / 100))} prefix='%' min={0} max={100} minFractionDigits={2} maxFractionDigits={2} />
              </div>

              <div className="flex-auto">
                <label htmlFor="cooler" className="block ">Cooler</label>
                <InputNumber disabled={overrideStatus === 0} inputId="cooler" value={cooler * 100} onValueChange={(e) => ws?.send("clr:" + (e.value as number / 100))} prefix='%' min={0} max={100} minFractionDigits={2} maxFractionDigits={2} />
              </div>
            </div>
          </div>
          <div className='flex'>
            <div className='bg-yellow-200 p-4'>
              <h2 className='text-center'>Temperature Controls</h2>
              <h2>Actual Temp: Cº{actualTemp}</h2>
              <div className="flex-auto mt-1">
                <label htmlFor="target" className="block ">Setpoint {` - Error ${error}`}</label>
                <InputNumber inputId="target" value={setPoint} onValueChange={(e) => ws?.send("set:" + (e.value as number))} prefix='Cº' minFractionDigits={2} maxFractionDigits={2} />
              </div>

              <div className="flex-auto">
                <label htmlFor="cooler" className="block ">Offset</label>
                <InputNumber inputId="cooler" value={offset} onValueChange={(e) => ws?.send("off:" + (e.value as number))} prefix='Cº' minFractionDigits={2} maxFractionDigits={2} />
              </div>
            </div>
          </div>
          <div className='col-span-2'>
            <div className='bg-yellow-200 p-4'>
              <h2 className='text-center'>PID Consts </h2>
              <div className='grid grid-cols-2'>
                <div className="flex-auto">
                  <label htmlFor="kp" className="block ">Kp {`- Actual Value of P: ${pTerm}`}</label>
                  <InputNumber inputId="kp" value={kp} onValueChange={(e) => ws?.send("kpv:" + (e.value as number))} minFractionDigits={2} maxFractionDigits={2} />
                </div>
                <div className="flex-auto">
                  <label htmlFor="ki" className="block ">Ki {`- Actual Value of I: ${iTerm}`}</label>
                  <InputNumber inputId="ki" value={ki} onValueChange={(e) => ws?.send("kiv:" + (e.value as number))} minFractionDigits={2} maxFractionDigits={2} />
                </div>
                <div className="flex-auto">
                  <label htmlFor="kd" className="block ">Kd {`- Actual Value of D: ${dTerm}`}</label>
                  <InputNumber inputId="kd" value={kd} onValueChange={(e) => ws?.send("kdv:" + (e.value as number))} minFractionDigits={2} maxFractionDigits={2} />
                </div>
                <div className="flex-auto">
                  <label htmlFor="ilim" className="block ">Integral Limit</label>
                  <InputNumber inputId="ilim" value={iLimit} onValueChange={(e) => ws?.send("ilv:" + (e.value as number))} minFractionDigits={2} maxFractionDigits={2} />
                </div>
              </div>
            </div>
            <div className='mt-2 col-span-2'>
              <Plot
                data={[data]}
                config={
                  {
                    responsive: true,
                    toImageButtonOptions: {
                      format: 'svg',
                      filename: 'plot',
                      height: 300,
                      width: 500,
                    }
                  }
                }
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                layout={{
                  uirevision: 'true',
                  title: 'Temperatura vs Tiempo',
                  width: 500, height: 300,
                  xaxis: {
                    autorange: true,
                    title: 'Tiempo',
                    showgrid: true,
                    zeroline: false
                  },
                  yaxis: {
                    autorange: true,
                    rangemode: 'normal',

                    title: 'Temperatura',
                    showline: false
                  }
                }}
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;
