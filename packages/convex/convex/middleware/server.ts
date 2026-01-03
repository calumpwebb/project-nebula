// ⚠️  SERVER ONLY - Do not import React or client code here

import { buildMiddleware, customQuery, customMutation, customAction } from './factory'
import { appVersion } from './configs/appVersion'
import { auth } from './configs/auth'
import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
} from '../_generated/server'

// Middleware runs top-to-bottom
const appVersionMw = buildMiddleware(appVersion)
const authMw = buildMiddleware(auth)

const middleware = [appVersionMw.server, authMw.server].filter(
  (mw): mw is NonNullable<typeof mw> => mw !== null
)

// Compose middleware using reduce
export const query = middleware.reduce((acc, mw) => customQuery(acc, mw.query), baseQuery)

export const mutation = middleware.reduce(
  (acc, mw) => customMutation(acc, mw.mutation),
  baseMutation
)

export const action = middleware.reduce((acc, mw) => customAction(acc, mw.action), baseAction)
