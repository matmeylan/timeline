import {Handlers} from '$fresh/server.ts'
import {redirect} from '../../../../core/http/redirect.ts'
import {settingsProfile} from '../../../../core/route/routes.ts'

export const handler: Handlers = {
  GET() {
    return redirect(settingsProfile, 302)
  },
}
