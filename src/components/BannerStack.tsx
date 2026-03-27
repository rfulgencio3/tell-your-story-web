export function BannerStack({
  errorMessage,
  notice,
}: {
  errorMessage: string | null
  notice: string | null
}) {
  if (!errorMessage && !notice) {
    return null
  }

  return (
    <section className="banner-stack">
      {errorMessage ? <div className="banner error">{errorMessage}</div> : null}
      {notice ? <div className="banner success">{notice}</div> : null}
    </section>
  )
}
