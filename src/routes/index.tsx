import {Container} from '../components/Container.tsx'

export default function Home() {
  return (
    <Container class="mt-16 lg:mt-32">
      <img
        class="my-6"
        src="/logo.svg"
        width="128"
        height="128"
        alt="the Fresh logo: a sliced lemon dripping with juice"
      />
      <h1 class="text-4xl font-bold">Welcome to your Journals</h1>
      <menu class="mt-4">
        <li>
          <a href="/start">Start a journal</a>
        </li>
        <li>
          <a href="/journals">See your journals</a>
        </li>
      </menu>
    </Container>
  )
}
