import Loader from '../ui/Loader'
import Skeleton from '../ui/Skeleton'
import { motion } from 'motion/react'
import Button from '../ui/Button'

type LoadingScreenProps = { statusMessage: string; errorMessage: string; onRetry: () => void }

export default function LoadingScreen({ statusMessage, errorMessage, onRetry }: LoadingScreenProps) {
  return (
    <motion.section
      className="panel panel-loading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <p className="panel-kicker">Boot sequence</p>
      <h1>Preparing your tunnel</h1>
      <p className="panel-text">{statusMessage}</p>
      <Loader />
      <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
        <Skeleton width="80%" height="12px" style={{ margin: '0 auto' }} />
        <Skeleton width="60%" height="12px" style={{ margin: '0 auto' }} />
        <Skeleton width="70%" height="12px" style={{ margin: '0 auto' }} />
      </div>
      {errorMessage && (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button type="button" variant="primary" onClick={onRetry}>
            Retry connection
          </Button>
        </motion.div>
      )}
    </motion.section>
  )
}
