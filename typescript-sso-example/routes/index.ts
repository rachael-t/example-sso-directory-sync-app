import express, { Request, Response, Router } from 'express'
import { ProfileAndToken, WorkOS, User, Directory, Group } from '@workos-inc/node'
import { List } from '@workos-inc/node/lib/common/interfaces/list.interface'
import { Server, Socket } from 'socket.io'
import morgan from 'morgan'
import 'dotenv/config'

const router: Router = express.Router()
const session: any = require('express-session')
interface Params {
  clientID: string;
  redirectURI: string;
  state?: string;
  provider?: string;
  connection?: string;
  organization?: string;
}

const workos: WorkOS = new WorkOS(process.env.WORKOS_API_KEY)
const clientID: string = process.env.WORKOS_CLIENT_ID !== undefined ? process.env.WORKOS_CLIENT_ID : ''
const organizationID: string = 'org_01HF2WMS8KRT7YT2KFRXCBNE6P'
const redirectURI: string = 'http://localhost:8000/callback'
const state: string = ''

router.get('/', (req: Request, res: Response) => {
  try {
    if (session.isloggedin) {
      res.render('login_successful.ejs', {
        profile: JSON.stringify(session.profile, null, 2),
        first_name: session.first_name
      })
    } else {
      return res.render('index.ejs')
    }
  } catch (error) {
    return res.render('error.ejs', { error: error })
  }
})

router.post('/login', (req: Request, res: Response) => {
  
  const login_type = req.body.login_method;

    const params: Params = {
        clientID: clientID,
        redirectURI: redirectURI,
        state: state
    };

    if (login_type === "saml") {
        params.organization = organizationID;
    } else {
        params.provider = login_type;
    }
  
  try {
    const url: string = workos.sso.getAuthorizationURL(params)

    res.redirect(url)
  } catch (error) {
    res.render('error.ejs', { error: error })
  }
})

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const code: string = typeof req.query.code === 'string' ? req.query.code : ''

    const profile: ProfileAndToken = await workos.sso.getProfileAndToken({
      code,
      clientID,
    })

    session.first_name = profile.profile.first_name
    session.profile = profile
    session.isloggedin = true

    res.redirect('/')
  } catch (error) {
    return res.render('error.ejs', { error: error })
  }
})

router.get('/logout', async (req: Request, res: Response) => {
  try {
    session.first_name = null
    session.profile = null
    session.isloggedin = null

    return res.redirect('/')
  } catch (error) {
    return res.render('error.ejs', { error: error })
  }
})

process.on('unhandledRejection', (reason, p) => {
  throw reason
})

router.get('/users', async (req, res) => {
  let directoryId: string | undefined
  if (typeof req.query.id === 'string') {
      directoryId = req.query.id
  }

  const users: List<User> = await workos.directorySync.listUsers({
      directory: directoryId,
      limit: 100,
  })
  res.render('users.ejs', { users: users.data })
})

export default router