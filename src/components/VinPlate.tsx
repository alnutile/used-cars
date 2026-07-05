// Stamped-metal VIN plate, carried over from the skill's report design.
export default function VinPlate({ vin }: { vin: string }) {
  return (
    <div className="vin-plate" aria-label={`VIN ${vin}`}>
      <span className="vin-plate-rivet" aria-hidden="true" />
      <span className="vin-plate-label">VIN</span>
      <span className="vin-plate-value">{vin}</span>
      <span className="vin-plate-rivet" aria-hidden="true" />
    </div>
  )
}
