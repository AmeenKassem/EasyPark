import { useState } from 'react'
import Layout from '../components/layout/layout'
import CreateParkingPage from '../pages/CreateParkingPage.jsx' // adjust path if needed
import Modal from '../components/modals/Modal.jsx'

export default function OwnerPage() {
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <Layout title="Manage Spots">
            <div className="ep-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                    className="ep-btn ep-btn-primary"
                    onClick={() => setCreateOpen(true)}
                >
                    + Create Parking
                </button>

                <button className="ep-btn" disabled>
                    My Spots (Coming soon)
                </button>
            </div>

            {createOpen && (
                <Modal onClose={() => setCreateOpen(false)}>
                    <div className="ep-modal">
                    <CreateParkingPage
                        onClose={() => setCreateOpen(false)}
                        onCreated={() => {/* refetch spots */}}
                    />
                    </div>
                </Modal>
            )}
        </Layout>
    )
}
