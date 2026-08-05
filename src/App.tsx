import { useState } from 'react'
import AdminView, { REPORTS, Report } from './AdminView'
import StaffView from './StaffView'

function App() {
  const [reports, setReports] = useState<Report[]>(REPORTS)

  return (
    <>
      <AdminView reports={reports} setReports={setReports} />
      <StaffView />
    </>
  )
}

export default App