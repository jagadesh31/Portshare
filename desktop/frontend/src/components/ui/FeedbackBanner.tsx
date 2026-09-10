type FeedbackBannerProps = {
  infoMessage?: string
  errorMessage?: string
}

export default function FeedbackBanner({ infoMessage, errorMessage }: FeedbackBannerProps) {
  if (!infoMessage && !errorMessage) return null
  
  return (
    <section className="feedback-row" aria-live="polite">
      {infoMessage && <p className="feedback feedback-info">{infoMessage}</p>}
      {errorMessage && <p className="feedback feedback-error">{errorMessage}</p>}
    </section>
  )
}
