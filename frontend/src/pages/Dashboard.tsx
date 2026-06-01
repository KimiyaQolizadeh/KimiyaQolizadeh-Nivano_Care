import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URLS } from '../api/axios'

interface ServiceStatus {
  service: string
  status: string
}

export default function Dashboard() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkServices = async () => {
      try {
        const endpoints = [
          { name: 'Auth Service', url: `${API_URLS.auth}/health` },
          { name: 'User Service', url: `${API_URLS.user}/health` },
          { name: 'Shift Service', url: `${API_URLS.shift}/health` },
          { name: 'Compliance Service', url: `${API_URLS.compliance}/health` },
        ]

        const results = await Promise.allSettled(
          endpoints.map(ep =>
            axios.get(ep.url).then(res => ({
              service: ep.name,
              status: res.data.status || 'unknown',
            }))
          )
        )

        const serviceStatuses = results.map((result, index) => ({
          service: endpoints[index].name,
          status: result.status === 'fulfilled' ? result.value.status : 'offline',
        }))

        setServices(serviceStatuses)
      } catch (error) {
        console.error('Error checking services:', error)
      } finally {
        setLoading(false)
      }
    }

    checkServices()
    const interval = setInterval(checkServices, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Services Status</h2>

          {loading ? (
            <p className="text-gray-600">Loading services...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-lg border-l-4 ${
                    service.status === 'healthy'
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {service.service}
                  </h3>
                  <p className={`text-lg font-semibold ${
                    service.status === 'healthy'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    Status: {service.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
