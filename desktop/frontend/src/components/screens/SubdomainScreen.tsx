import { type FormEvent } from 'react'
import { motion } from 'motion/react'
import type { ClientSession } from '../../lib/api'
import { ROOT_DOMAIN } from '../../lib/api'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Divider from '../ui/Divider'
import AuthToggle from '../dashboard/AuthToggle'

type SubdomainScreenProps = {
  session: ClientSession
  subdomainInput: string
  setSubdomainInput: (v: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  isBusy: boolean
  gauthEnabled: boolean
  onAuthToggle: () => void
}

export default function SubdomainScreen({
  session, subdomainInput, setSubdomainInput, onSubmit, isBusy, gauthEnabled, onAuthToggle
}: SubdomainScreenProps) {
  return (
    <motion.section
      className="panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <p className="panel-kicker">Step 1 of 2</p>
      <h1>Reserve your subdomain</h1>
      <p className="panel-text">Choose your permanent public URL prefix before exposing any local port.</p>
      <p className="client-id">Client ID: {session.id}</p>

      <form id="subdomain-form" className="input-form" onSubmit={onSubmit}>
        <Input
          id="subdomain"
          label="Subdomain name"
          value={subdomainInput}
          onChange={e => setSubdomainInput(e.target.value)}
          placeholder="myapp"
          autoComplete="off"
          spellCheck={false}
          disabled={isBusy}
          suffix={`.${ROOT_DOMAIN}`}
        />
        <Button id="claim-subdomain-btn" type="submit" disabled={isBusy}>
          {isBusy ? 'Checking...' : 'Claim subdomain →'}
        </Button>
      </form>

      <Divider />

      <AuthToggle
        session={session}
        gauthEnabled={gauthEnabled}
        isBusy={isBusy}
        onToggle={onAuthToggle}
        id="gauth-toggle-btn"
      />
    </motion.section>
  )
}
