import {FreshContext} from '$fresh/server.ts'
import {JournalService} from '../../../core/domain/journal.ts'
import type {Session} from '../../../core/domain/user/session.types.ts'
import {Journal, JournalNotFoundError} from '../../../core/domain/journal.types.ts'
import {AuthenticatedRouteState} from '../_middleware.ts'

export interface JournalRouteState extends AuthenticatedRouteState {
  journal: Journal
}

export function handler(req: Request, ctx: FreshContext<JournalRouteState>) {
  if (ctx.destination !== 'route') {
    return ctx.next()
  }

  const {session} = ctx.state
  try {
    const service = new JournalService()
    const journal = service.getJournalBySlug(ctx.params.slug)
    if (!isJournalOwner(journal, session)) {
      return ctx.renderNotFound()
    }
    ctx.state.journal = journal
    return ctx.next()
  } catch (err) {
    if (err instanceof JournalNotFoundError) {
      return ctx.renderNotFound()
    }
    throw err
  }
}

export function isJournalOwner(journal: Journal, session: Session) {
  return journal.ownerId === session.userId
}
