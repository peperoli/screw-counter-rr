import type { Route } from './+types/home'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
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
      subscribe('current-count').catch(console.error)
      subscribe('success').catch(console.error)
    }
  }, [mqttConnected, subscribe])

  // Handle MQTT messages
  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage) return

    console.log('Processing MQTT message:', latestMessage)

    if (latestMessage.topic === 'current-count') {
      // remove all non-digit characters from the payload
      // and convert to number
      setCount(Number(latestMessage.payload.replaceAll(/[^0-9]/g, '')))
    } else if (latestMessage.topic === 'success') {
      setState('success')
    }
  }, [messages])

  const handleReset = () => {
    setCount(0)
    publish('reset', '0').catch(console.error)
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
        {state === 'idle' ?
          <Form />
        : state === 'counting' ?
          <section className="grid gap-4">
            <p className="text-7xl font-bold">
              {count}
              <span className="text-gray-400">/{amount}</span>
            </p>
            <button
              onClick={handleReset}
              className="bg-red-500 font-bold text-xl p-4 rounded-xl w-full cursor-pointer"
            >
              Abbrechen
            </button>
          </section>
        : state === 'success' ?
          <section className="grid gap-4">
            <p className="text-7xl font-bold text-green-700">{count} Einheiten fertig! 🎉</p>
            <button
              onClick={handleReset}
              className="bg-blue-500 font-bold text-xl p-4 rounded-xl w-full cursor-pointer"
            >
              Zurücksetzen
            </button>
          </section>
        : null}
      </section>
    </main>
  )
}

function Form() {
  const { publish } = useMqtt()
  const navigate = useNavigate()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const amount = formData.get('amount') as string | null

    if (!amount) {
      alert('Menge ist erforderlich')
      return
    }

    publish('count-target', amount.padStart(10, '0')).catch(console.error)
    navigate(`/?amount=${amount}`)
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <fieldset className="flex border rounded-xl items-center">
        <label htmlFor="amount" className="text-xl whitespace-nowrap px-4 text-gray-600">
          Menge:
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          min="1"
          max="9999"
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
