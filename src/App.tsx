import { useState } from 'react'
import AdminView, { REPORTS, Report } from './AdminView'

function App() {
  const [reports, setReports] = useState<Report[]>(REPORTS)

  return (
    <AdminView reports={reports} setReports={setReports} />
  )
}

export default App