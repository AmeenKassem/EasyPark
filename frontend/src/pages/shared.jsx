import Layout from '../components/layout/layout'
import { getCurrentUser } from '../services/session'

export default function SharedPage() {
    const user = getCurrentUser()

    return (
        <Layout title="Dashboard">
            <div className="ep-card">
                {user ? (
                    <p style={{ margin: 0, opacity: 0.9 }}>
                        Welcome, {user.fullName}. Use the top navigation to continue.
                    </p>
                ) : (
                    <p style={{ margin: 0, opacity: 0.9 }}>
                        You are not logged in. Use the top-right buttons to login or
                        register.
                    </p>
                )}
            </div>
        </Layout>
    )
}
