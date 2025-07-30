import {Head} from '$fresh/runtime.ts'
import {Container} from '../components/Container.tsx'
import {Link} from '../components/Link.tsx'

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <Container>
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="text-4xl font-bold">404 - Page not found</h1>
        <p class="my-4">The page you were looking for doesn't exist.</p>
        <Link href="/">Go back home</Link>
      </Container>
    </>
  )
}
