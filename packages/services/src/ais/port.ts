export interface VesselPosition {
  imoNumber: string
  mmsi: string
  latitude: number
  longitude: number
  speed: number       // knots
  course: number      // degrees
  heading: number | null
  status: string      // 'underway' | 'at_anchor' | 'moored' | etc.
  timestamp: Date
  portName: string | null
  eta: Date | null
}

export interface IAISProvider {
  getVesselPosition(imoNumber: string): Promise<VesselPosition | null>
  getVesselHistory(imoNumber: string, fromDate: Date, toDate: Date): Promise<VesselPosition[]>
}
