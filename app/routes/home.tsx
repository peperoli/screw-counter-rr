import type { Route } from './+types/home'
import { Welcome } from '../welcome/welcome'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useMqtt } from '~/components/MqttContext'

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Screw Counter' }, { name: 'description', content: 'Welcome to React Router!' }]
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: 'Hello from Vercel' }
}

export default function Home() {
  const [state, setState] = useState<'idle' | 'counting' | 'success'>('idle')
  const [count, setCount] = useState(0)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const amount = searchParams.get('amount')
  const { isConnected, mqttConnected, messages, subscribe, publish } = useMqtt()

  useEffect(() => {
    if (amount) {
      setState('counting')
    }
  }, [amount])

  // Subscribe to screw counter topics when component mounts
  useEffect(() => {
    if (mqttConnected) {
      subscribe('screw-counter/increment').catch(console.error)
      subscribe('screw-counter/reset').catch(console.error)
    }
  }, [mqttConnected, subscribe])

  // Handle MQTT messages
  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage) return

    console.log('Processing MQTT message:', latestMessage)
    
    if (latestMessage.topic === 'screw-counter/increment') {
      setCount(prev => prev + 1)
    } else if (latestMessage.topic === 'screw-counter/reset') {
      setCount(0)
    }
  }, [messages])

  const handleManualIncrement = () => {
    const newCount = count + 1
    setCount(newCount)
    // Publish the increment to MQTT
    publish('screw-counter/count', newCount.toString()).catch(console.error)
  }

  const handleReset = () => {
    setCount(0)
    publish('screw-counter/reset', '0').catch(console.error)
    setState('idle')
    navigate('/')
  }

  return (
    <main className="p-6 text-center max-w-lg mx-auto mt-32 font-sans">
      <div className="absolute left-0 top-0 m-2 text-sm">
        <div>Socket: {isConnected ? '🟢' : '🔴'}</div>
        <div>MQTT: {mqttConnected ? '🟢' : '🔴'}</div>
        <div>Messages: {messages.length}</div>
      </div>
      <section>
        <h1 className="text-4xl font-bold">Schraubenzähler</h1>
        <p className="mb-6">Don't screw the counter, count the screws.</p>
        {state === 'idle' && <Form />}
        {state === 'counting' && (
          <section className="grid gap-4">
            <p className="text-7xl font-bold">
              {count}
              <span className="text-gray-400">/{amount}</span>
            </p>
            <button
              onClick={handleManualIncrement}
              className="bg-blue-500 font-bold text-xl p-4 rounded-xl w-full cursor-pointer"
            >
              + Manuell zählen
            </button>
            <button
              onClick={handleReset}
              className="bg-red-500 font-bold text-xl p-4 rounded-xl w-full cursor-pointer"
            >
              Abbrechen & Reset
            </button>
          </section>
        )}
      </section>
    </main>
  )
}

function Form() {
  return (
    <form method="post" action="/api/start-counter" className="grid gap-4">
      <fieldset className="flex border rounded-xl items-center">
        <label htmlFor="amount" className="text-xl whitespace-nowrap px-4 text-gray-600">
          Menge:
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          min="1"
          defaultValue="100"
          className=" p-4 text-xl rounded-r-xl w-full"
        />
      </fieldset>
      <button
        type="submit"
        className="bg-lime-500 font-bold text-xl p-4 rounded-xl w-full cursor-pointer"
      >
        Zähler starten
      </button>
    </form>
  )
}
