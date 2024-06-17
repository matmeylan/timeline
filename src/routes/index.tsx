import {useSignal} from '@preact/signals'
import Counter from '../islands/Counter.tsx'

export default function Home() {
  const count = useSignal(3)
  return (
    <main class="flex flex-col items-center justify-center">
      <img
        class="my-6"
        src="/logo.svg"
        width="128"
        height="128"
        alt="the Fresh logo: a sliced lemon dripping with juice"
      />
      <h1 class="text-4xl font-bold">Welcome to Fresh</h1>
      <p class="my-4">This is a cool project!</p>
      <Counter count={count} />
    </main>
  )
}
