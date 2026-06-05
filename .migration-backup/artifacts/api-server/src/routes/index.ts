import { Router } from 'express'
import healthRouter from './health'
import authRouter from './auth'
import drawsRouter from './draws'
import ticketsRouter from './tickets'
import depositsRouter from './deposits'
import userRouter from './user'
import adminRouter from './admin'
import settingsRouter from './settings'

const router = Router()

router.use(healthRouter)
router.use('/auth', authRouter)
router.use('/draws', drawsRouter)
router.use('/tickets', ticketsRouter)
router.use('/deposits', depositsRouter)
router.use('/user', userRouter)
router.use('/admin', adminRouter)
router.use('/settings', settingsRouter)

export default router
