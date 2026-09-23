import { ReportAttachment } from "./attachment"

export interface ArrayColumnValues {
  [arrayKey: string]: string // e.g. "ARRAY 1", "ARRAY 2" ... "ARRAY 15"
}

export interface GeneralStatePowerPlant {
  illuminationLightFittings: string
  cleanlinessSurroundings: string
  statePerimeterFence: string
  cleanlinessPowerHouse: string
}

export interface SupportStructureCondition {
  concreteBase: ArrayColumnValues
  nutsAndBolts: ArrayColumnValues
  spacersAndEndClamps: ArrayColumnValues
  antiRustCondition: ArrayColumnValues
}

export interface PvArraysData {
  pvModuleRating: ArrayColumnValues
  numberOfPvPerArray: ArrayColumnValues
  pvConnectionConfig: ArrayColumnValues
  alignmentOfPvs: ArrayColumnValues
  measuredVoc: ArrayColumnValues
  expectedVoc: ArrayColumnValues
  measuredVmpBreakerInput: ArrayColumnValues
  measuredVmpBreakerOutput: ArrayColumnValues
  calculatedVmp: ArrayColumnValues
  measuredImp: ArrayColumnValues
  calculatedImp: ArrayColumnValues
  dateTimeReadingsTaken: ArrayColumnValues
}

export interface OutdoorSwitchgearCables {
  dcSurge: ArrayColumnValues
  breaker: ArrayColumnValues
  fuses: ArrayColumnValues
  switchgearEnclosure: ArrayColumnValues
  cableTermination: ArrayColumnValues
  cableLabels: ArrayColumnValues
  cables: ArrayColumnValues
  conditionsSafetyLabels: ArrayColumnValues
}

export interface CableManagementRouting {
  conditionPvcPipes: ArrayColumnValues
  arrangementCables: ArrayColumnValues
  chamberCondition: ArrayColumnValues
  slabsCondition: ArrayColumnValues
}

export interface IndoorPvSwitchgear {
  connectedToEquipment: ArrayColumnValues
  dcSurgeCondition: ArrayColumnValues
  breakerCondition: ArrayColumnValues
  fusesCondition: ArrayColumnValues
  switchgearEnclosureSupport: ArrayColumnValues
  cableTermination: ArrayColumnValues
  cableLabels: ArrayColumnValues
  cablesCondition: ArrayColumnValues
  cableManagement: ArrayColumnValues
  conditionsSafetyLabels: ArrayColumnValues
  measuredVoc: ArrayColumnValues
  expectedVoc: ArrayColumnValues
  measuredVmpBreakerInput: ArrayColumnValues
  measuredVmpBreakerOutput: ArrayColumnValues
  calculatedVmp: ArrayColumnValues
  measuredImp: ArrayColumnValues
  calculatedImp: ArrayColumnValues
  dateTimeReadingsTaken: ArrayColumnValues
}

export interface MpptData {
  status: ArrayColumnValues
  inputCableCondition: ArrayColumnValues
  outputCableCondition: ArrayColumnValues
  inputCableSize: ArrayColumnValues
  outputCableSize: ArrayColumnValues
  conditionInputCableTermination: ArrayColumnValues
  conditionOutputCableTermination: ArrayColumnValues
  outputBreakerCondition: ArrayColumnValues
  outputBreakerRating: ArrayColumnValues
  measuredPvInputVoltage: ArrayColumnValues
  measuredOutputVoltage: ArrayColumnValues
  measuredInputCurrent: ArrayColumnValues
  measuredOutputCurrent: ArrayColumnValues
  dateTimeReadingsTaken: ArrayColumnValues
}

export interface ClInverterData {
  deviceCondition: ArrayColumnValues
  pvInputCableCondition: ArrayColumnValues
  pvInputCableSize: ArrayColumnValues
  conditionPvInputCableTermination: ArrayColumnValues
  conditionAcCableTermination: ArrayColumnValues
  acSpdArrestor1Condition: ArrayColumnValues
  dcSpdArrestor1Condition: ArrayColumnValues
  dcSpdArrestor2Condition: ArrayColumnValues
  acBreakerCondition: ArrayColumnValues
  acRccbCondition: ArrayColumnValues
  conditionOfFuses: ArrayColumnValues
  measuredAveragePvInputVoltage: ArrayColumnValues
  measuredOutputVoltage: ArrayColumnValues
  measuredOutputCurrent: ArrayColumnValues
  inputCableCondition: ArrayColumnValues
  outputCableCondition: ArrayColumnValues
  dateTimeReadingsTaken: ArrayColumnValues
}

export interface BatteryInverterData {
  deviceCondition: ArrayColumnValues
  deviceConfiguration: ArrayColumnValues
  bessCableConnectionCondition: ArrayColumnValues
  bessCableConnectionSize: ArrayColumnValues
  bessCableTerminationCondition: ArrayColumnValues
  acInputCableConnectionCondition: ArrayColumnValues
  acInputCableConnectionSize: ArrayColumnValues
  acInputCableTerminationCondition: ArrayColumnValues
  acOutputCableConnectionCondition: ArrayColumnValues
  acOutputCableConnectionSize: ArrayColumnValues
  acOutputCableTerminationCondition: ArrayColumnValues
  communicationCableStatus: ArrayColumnValues
  acSpd1Condition: ArrayColumnValues
  acSpd2Condition: ArrayColumnValues
  acBreakerCondition: ArrayColumnValues
  acRccbCondition: ArrayColumnValues
  inverterDcBreakerCondition: ArrayColumnValues
  measuredDcVoltage: ArrayColumnValues
  measuredAcOutputVoltage: ArrayColumnValues
  measuredAcInputVoltage: ArrayColumnValues
  measuredDcCurrent: ArrayColumnValues
  dateTimeReadingsTaken: ArrayColumnValues
}

export interface BessData {
  physicalCondition: ArrayColumnValues
  voltage: ArrayColumnValues
  current: ArrayColumnValues
  generalTemperature: ArrayColumnValues
  batteryDisconnectSwitchgearStatus: ArrayColumnValues
  busbarStatusCableTerminationStatus: ArrayColumnValues
}

export interface GridDistribution {
  isolationFuseFeederPillarCondition: ArrayColumnValues
  cableTermination: ArrayColumnValues
  cableCondition: ArrayColumnValues
  gridCondition: ArrayColumnValues
  gridLnVoltage: ArrayColumnValues
  gridCurrent: ArrayColumnValues
}

export interface DieselGeneratorData {
  equipmentCondition: ArrayColumnValues
  lastUseDateTime: ArrayColumnValues
  dieselLevel: ArrayColumnValues
  cableCondition: ArrayColumnValues
  cableTerminationCondition: ArrayColumnValues
  runTime: ArrayColumnValues
  lastServicedDate: ArrayColumnValues
  nextScheduledServiceDate: ArrayColumnValues
  remark: string
}

export interface EarthingItemEntry {
  id: string
  itemEquipment: string
  values: string
  remark: string
}

export interface EquipmentStatusItem {
  id: string
  name: string
  status: string
  dateLastMaintained: string
  dateNextScheduled: string
  remarks: string
}

export interface InventoryConditionItem {
  id: string
  name: string
  condition: string
  remark: string
}

export interface GveQuarterlyRecordData {
  title?: string
  // Page 1 Metadata
  siteName: string
  preparedBy: string
  preparedByDate: string
  approvedBy: string
  approvedByDate: string
  personnelName: string
  designation: string
  dateMostRecentMaintenance: string
  date: string
  dateNextScheduledMaintenance: string

  // Signatures
  supervisorSignature?: string
  supervisorSignatureDate?: string
  operatorSignature?: string
  operatorSignatureDate?: string

  // Section 1: General State of Power Plant
  generalState: GeneralStatePowerPlant

  // Section 2: Conditions of Support Structure
  supportStructure: SupportStructureCondition

  // Section 3: PV Arrays
  pvArrays: PvArraysData

  // Section 4: Outdoor Switch Gear and Cables
  outdoorSwitchgear: OutdoorSwitchgearCables

  // Section 5: Cable Management and Routing
  cableManagement: CableManagementRouting

  // Section 6: Indoor PV Switch Gear and Cables
  indoorPvSwitchgear: IndoorPvSwitchgear

  // Section 7: MPPT
  mppt: MpptData

  // Section 8: CL Inverter
  clInverter: ClInverterData

  // Section 9: Battery Inverter
  batteryInverter: BatteryInverterData

  // Section 10: BESS
  bess: BessData

  // Section 11: Grid Distribution
  gridDistribution: GridDistribution

  // Section 12: Diesel Generator
  dieselGenerator: DieselGeneratorData
  otherCommentGridLineAndGenerator: string

  // Section 13: Earthing System
  earthingSystem: EarthingItemEntry[]

  // Section 14: Equipment Maintenance Status
  equipmentMaintenance: EquipmentStatusItem[]

  // Section 15: PPEs
  ppesList: InventoryConditionItem[]

  // Section 16: Tools List
  toolsList: InventoryConditionItem[]

  // Section 17: General Comments
  commentOnOperators: string
  commentOnSecurityPersonnel: string
  commentOnSafetySignage: string
  commentOnMeteringVendingCustomers: string
  generalRemark: string

  // Photo Attachments & Visual Evidence
  attachments?: ReportAttachment[]
}

// Generate default array keys for 15 columns
export const ARRAY_KEYS_15 = Array.from(
  { length: 15 },
  (_, i) => `ARRAY ${i + 1}`,
)
export const MPPT_KEYS_15 = Array.from(
  { length: 15 },
  (_, i) => `MPPT ${i + 1}`,
)
export const CL_INV_KEYS_15 = Array.from(
  { length: 15 },
  (_, i) => `CL INV ${i + 1}`,
)
export const INV_KEYS_15 = Array.from({ length: 15 }, (_, i) => `INV ${i + 1}`)
export const STRING_KEYS_15 = Array.from(
  { length: 15 },
  (_, i) => `STRING ${i + 1}`,
)
export const GRID_PHASE_KEYS = [
  "R 1",
  "Y 1",
  "B 1",
  "N 1",
  "R 2",
  "Y 2",
  "B 2",
  "N 2",
  "R 3",
  "Y 3",
  "B 3",
  "N 3",
]
export const DG_KEYS = ["DG 1", "DG 2"]

export function createEmptyArrayValues(
  keys: string[],
  defaultValue = "GOOD",
): ArrayColumnValues {
  const res: ArrayColumnValues = {}
  keys.forEach((k) => {
    res[k] = defaultValue
  })
  return res
}

export function createEmptyGveQuarterlyData(): GveQuarterlyRecordData {
  const today = new Date().toISOString().split("T")[0]
  return {
    siteName: "",
    preparedBy: "",
    preparedByDate: today,
    approvedBy: "",
    approvedByDate: today,
    personnelName: "",
    designation: "",
    dateMostRecentMaintenance: today,
    date: today,
    dateNextScheduledMaintenance: today,

    supervisorSignature: "",
    supervisorSignatureDate: today,
    operatorSignature: "",
    operatorSignatureDate: today,

    generalState: {
      illuminationLightFittings:
        "Good working condition across powerhouse and yard.",
      cleanlinessSurroundings: "Clean and free of overgrowth.",
      statePerimeterFence: "Intact with razor wire secured.",
      cleanlinessPowerHouse: "Dust-free and properly ventilated.",
    },

    supportStructure: {
      concreteBase: createEmptyArrayValues(ARRAY_KEYS_15, "GOOD"),
      nutsAndBolts: createEmptyArrayValues(ARRAY_KEYS_15, "TORQUED"),
      spacersAndEndClamps: createEmptyArrayValues(ARRAY_KEYS_15, "SECURE"),
      antiRustCondition: createEmptyArrayValues(ARRAY_KEYS_15, "OK"),
    },

    pvArrays: {
      pvModuleRating: createEmptyArrayValues(ARRAY_KEYS_15, "450W"),
      numberOfPvPerArray: createEmptyArrayValues(ARRAY_KEYS_15, "24"),
      pvConnectionConfig: createEmptyArrayValues(ARRAY_KEYS_15, "2x12"),
      alignmentOfPvs: createEmptyArrayValues(ARRAY_KEYS_15, "ALIGNED"),
      measuredVoc: createEmptyArrayValues(ARRAY_KEYS_15, "620V"),
      expectedVoc: createEmptyArrayValues(ARRAY_KEYS_15, "625V"),
      measuredVmpBreakerInput: createEmptyArrayValues(ARRAY_KEYS_15, "515V"),
      measuredVmpBreakerOutput: createEmptyArrayValues(ARRAY_KEYS_15, "514V"),
      calculatedVmp: createEmptyArrayValues(ARRAY_KEYS_15, "516V"),
      measuredImp: createEmptyArrayValues(ARRAY_KEYS_15, "18.4A"),
      calculatedImp: createEmptyArrayValues(ARRAY_KEYS_15, "18.5A"),
      dateTimeReadingsTaken: createEmptyArrayValues(ARRAY_KEYS_15, "12:00 PM"),
    },

    outdoorSwitchgear: {
      dcSurge: createEmptyArrayValues(ARRAY_KEYS_15, "GOOD"),
      breaker: createEmptyArrayValues(ARRAY_KEYS_15, "NORMAL"),
      fuses: createEmptyArrayValues(ARRAY_KEYS_15, "INTACT"),
      switchgearEnclosure: createEmptyArrayValues(ARRAY_KEYS_15, "SEALED"),
      cableTermination: createEmptyArrayValues(ARRAY_KEYS_15, "TIGHT"),
      cableLabels: createEmptyArrayValues(ARRAY_KEYS_15, "CLEAR"),
      cables: createEmptyArrayValues(ARRAY_KEYS_15, "GOOD"),
      conditionsSafetyLabels: createEmptyArrayValues(ARRAY_KEYS_15, "VISIBLE"),
    },

    cableManagement: {
      conditionPvcPipes: createEmptyArrayValues(ARRAY_KEYS_15, "INTACT"),
      arrangementCables: createEmptyArrayValues(ARRAY_KEYS_15, "NEAT"),
      chamberCondition: createEmptyArrayValues(ARRAY_KEYS_15, "DRY"),
      slabsCondition: createEmptyArrayValues(ARRAY_KEYS_15, "GOOD"),
    },

    indoorPvSwitchgear: {
      connectedToEquipment: createEmptyArrayValues(ARRAY_KEYS_15, "CL INV"),
      dcSurgeCondition: createEmptyArrayValues(ARRAY_KEYS_15, "GOOD"),
      breakerCondition: createEmptyArrayValues(ARRAY_KEYS_15, "NORMAL"),
      fusesCondition: createEmptyArrayValues(ARRAY_KEYS_15, "INTACT"),
      switchgearEnclosureSupport: createEmptyArrayValues(
        ARRAY_KEYS_15,
        "SECURE",
      ),
      cableTermination: createEmptyArrayValues(ARRAY_KEYS_15, "TIGHT"),
      cableLabels: createEmptyArrayValues(ARRAY_KEYS_15, "CLEAR"),
      cablesCondition: createEmptyArrayValues(ARRAY_KEYS_15, "GOOD"),
      cableManagement: createEmptyArrayValues(ARRAY_KEYS_15, "NEAT"),
      conditionsSafetyLabels: createEmptyArrayValues(ARRAY_KEYS_15, "VISIBLE"),
      measuredVoc: createEmptyArrayValues(ARRAY_KEYS_15, "620V"),
      expectedVoc: createEmptyArrayValues(ARRAY_KEYS_15, "625V"),
      measuredVmpBreakerInput: createEmptyArrayValues(ARRAY_KEYS_15, "515V"),
      measuredVmpBreakerOutput: createEmptyArrayValues(ARRAY_KEYS_15, "514V"),
      calculatedVmp: createEmptyArrayValues(ARRAY_KEYS_15, "516V"),
      measuredImp: createEmptyArrayValues(ARRAY_KEYS_15, "18.4A"),
      calculatedImp: createEmptyArrayValues(ARRAY_KEYS_15, "18.5A"),
      dateTimeReadingsTaken: createEmptyArrayValues(ARRAY_KEYS_15, "12:00 PM"),
    },

    mppt: {
      status: createEmptyArrayValues(MPPT_KEYS_15, "ACTIVE"),
      inputCableCondition: createEmptyArrayValues(MPPT_KEYS_15, "GOOD"),
      outputCableCondition: createEmptyArrayValues(MPPT_KEYS_15, "GOOD"),
      inputCableSize: createEmptyArrayValues(MPPT_KEYS_15, "16mm2"),
      outputCableSize: createEmptyArrayValues(MPPT_KEYS_15, "25mm2"),
      conditionInputCableTermination: createEmptyArrayValues(
        MPPT_KEYS_15,
        "TIGHT",
      ),
      conditionOutputCableTermination: createEmptyArrayValues(
        MPPT_KEYS_15,
        "TIGHT",
      ),
      outputBreakerCondition: createEmptyArrayValues(MPPT_KEYS_15, "NORMAL"),
      outputBreakerRating: createEmptyArrayValues(MPPT_KEYS_15, "100A"),
      measuredPvInputVoltage: createEmptyArrayValues(MPPT_KEYS_15, "515V"),
      measuredOutputVoltage: createEmptyArrayValues(MPPT_KEYS_15, "54.2V"),
      measuredInputCurrent: createEmptyArrayValues(MPPT_KEYS_15, "18.4A"),
      measuredOutputCurrent: createEmptyArrayValues(MPPT_KEYS_15, "175A"),
      dateTimeReadingsTaken: createEmptyArrayValues(MPPT_KEYS_15, "12:30 PM"),
    },

    clInverter: {
      deviceCondition: createEmptyArrayValues(CL_INV_KEYS_15, "OPERATIONAL"),
      pvInputCableCondition: createEmptyArrayValues(CL_INV_KEYS_15, "GOOD"),
      pvInputCableSize: createEmptyArrayValues(CL_INV_KEYS_15, "16mm2"),
      conditionPvInputCableTermination: createEmptyArrayValues(
        CL_INV_KEYS_15,
        "TIGHT",
      ),
      conditionAcCableTermination: createEmptyArrayValues(
        CL_INV_KEYS_15,
        "TIGHT",
      ),
      acSpdArrestor1Condition: createEmptyArrayValues(CL_INV_KEYS_15, "GOOD"),
      dcSpdArrestor1Condition: createEmptyArrayValues(CL_INV_KEYS_15, "GOOD"),
      dcSpdArrestor2Condition: createEmptyArrayValues(CL_INV_KEYS_15, "GOOD"),
      acBreakerCondition: createEmptyArrayValues(CL_INV_KEYS_15, "NORMAL"),
      acRccbCondition: createEmptyArrayValues(CL_INV_KEYS_15, "NORMAL"),
      conditionOfFuses: createEmptyArrayValues(CL_INV_KEYS_15, "INTACT"),
      measuredAveragePvInputVoltage: createEmptyArrayValues(
        CL_INV_KEYS_15,
        "515V",
      ),
      measuredOutputVoltage: createEmptyArrayValues(CL_INV_KEYS_15, "400V"),
      measuredOutputCurrent: createEmptyArrayValues(CL_INV_KEYS_15, "45A"),
      inputCableCondition: createEmptyArrayValues(CL_INV_KEYS_15, "GOOD"),
      outputCableCondition: createEmptyArrayValues(CL_INV_KEYS_15, "GOOD"),
      dateTimeReadingsTaken: createEmptyArrayValues(CL_INV_KEYS_15, "01:00 PM"),
    },

    batteryInverter: {
      deviceCondition: createEmptyArrayValues(INV_KEYS_15, "OPERATIONAL"),
      deviceConfiguration: createEmptyArrayValues(INV_KEYS_15, "PARALLEL"),
      bessCableConnectionCondition: createEmptyArrayValues(INV_KEYS_15, "GOOD"),
      bessCableConnectionSize: createEmptyArrayValues(INV_KEYS_15, "70mm2"),
      bessCableTerminationCondition: createEmptyArrayValues(
        INV_KEYS_15,
        "TIGHT",
      ),
      acInputCableConnectionCondition: createEmptyArrayValues(
        INV_KEYS_15,
        "GOOD",
      ),
      acInputCableConnectionSize: createEmptyArrayValues(INV_KEYS_15, "35mm2"),
      acInputCableTerminationCondition: createEmptyArrayValues(
        INV_KEYS_15,
        "TIGHT",
      ),
      acOutputCableConnectionCondition: createEmptyArrayValues(
        INV_KEYS_15,
        "GOOD",
      ),
      acOutputCableConnectionSize: createEmptyArrayValues(INV_KEYS_15, "35mm2"),
      acOutputCableTerminationCondition: createEmptyArrayValues(
        INV_KEYS_15,
        "TIGHT",
      ),
      communicationCableStatus: createEmptyArrayValues(
        INV_KEYS_15,
        "CONNECTED",
      ),
      acSpd1Condition: createEmptyArrayValues(INV_KEYS_15, "GOOD"),
      acSpd2Condition: createEmptyArrayValues(INV_KEYS_15, "GOOD"),
      acBreakerCondition: createEmptyArrayValues(INV_KEYS_15, "NORMAL"),
      acRccbCondition: createEmptyArrayValues(INV_KEYS_15, "NORMAL"),
      inverterDcBreakerCondition: createEmptyArrayValues(INV_KEYS_15, "NORMAL"),
      measuredDcVoltage: createEmptyArrayValues(INV_KEYS_15, "51.8V"),
      measuredAcOutputVoltage: createEmptyArrayValues(INV_KEYS_15, "230V"),
      measuredAcInputVoltage: createEmptyArrayValues(INV_KEYS_15, "230V"),
      measuredDcCurrent: createEmptyArrayValues(INV_KEYS_15, "120A"),
      dateTimeReadingsTaken: createEmptyArrayValues(INV_KEYS_15, "01:30 PM"),
    },

    bess: {
      physicalCondition: createEmptyArrayValues(STRING_KEYS_15, "GOOD"),
      voltage: createEmptyArrayValues(STRING_KEYS_15, "51.8V"),
      current: createEmptyArrayValues(STRING_KEYS_15, "25A"),
      generalTemperature: createEmptyArrayValues(STRING_KEYS_15, "26°C"),
      batteryDisconnectSwitchgearStatus: createEmptyArrayValues(
        STRING_KEYS_15,
        "ON",
      ),
      busbarStatusCableTerminationStatus: createEmptyArrayValues(
        STRING_KEYS_15,
        "NORMAL",
      ),
    },

    gridDistribution: {
      isolationFuseFeederPillarCondition: createEmptyArrayValues(
        GRID_PHASE_KEYS,
        "GOOD",
      ),
      cableTermination: createEmptyArrayValues(GRID_PHASE_KEYS, "TIGHT"),
      cableCondition: createEmptyArrayValues(GRID_PHASE_KEYS, "GOOD"),
      gridCondition: createEmptyArrayValues(GRID_PHASE_KEYS, "NORMAL"),
      gridLnVoltage: createEmptyArrayValues(GRID_PHASE_KEYS, "230V"),
      gridCurrent: createEmptyArrayValues(GRID_PHASE_KEYS, "35A"),
    },

    dieselGenerator: {
      equipmentCondition: createEmptyArrayValues(DG_KEYS, "GOOD"),
      lastUseDateTime: createEmptyArrayValues(DG_KEYS, today),
      dieselLevel: createEmptyArrayValues(DG_KEYS, "85%"),
      cableCondition: createEmptyArrayValues(DG_KEYS, "GOOD"),
      cableTerminationCondition: createEmptyArrayValues(DG_KEYS, "TIGHT"),
      runTime: createEmptyArrayValues(DG_KEYS, "240 HRS"),
      lastServicedDate: createEmptyArrayValues(DG_KEYS, today),
      nextScheduledServiceDate: createEmptyArrayValues(DG_KEYS, today),
      remark: "Generator tested and operational under manual transfer.",
    },
    otherCommentGridLineAndGenerator:
      "Grid power stable over Q2 period. Generator maintained with oil change.",

    earthingSystem: [
      // Left Table (Page 7)
      {
        id: "e1",
        itemEquipment: "Perimeter fencing",
        values: "0.45 Ω",
        remark: "Passed",
      },
      {
        id: "e2",
        itemEquipment: "PV support structure",
        values: "0.38 Ω",
        remark: "Passed",
      },
      {
        id: "e3",
        itemEquipment: "Power house door",
        values: "0.40 Ω",
        remark: "Passed",
      },
      {
        id: "e4",
        itemEquipment: "power house burglary proof",
        values: "0.42 Ω",
        remark: "Passed",
      },
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `e_mppt_${i + 1}`,
        itemEquipment: `MPPT ${i + 1}`,
        values: "0.35 Ω",
        remark: "Good",
      })),
      ...Array.from({ length: 16 }, (_, i) => ({
        id: `e_dcspd_${i + 1}`,
        itemEquipment: `DC SPD ${i + 1}`,
        values: "0.30 Ω",
        remark: "Good",
      })),
      // Right Table (Page 7)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `e_pvinv_${i + 1}`,
        itemEquipment: `PV INVERTER ${i + 1}`,
        values: "0.32 Ω",
        remark: "Good",
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `e_inv_${i + 1}`,
        itemEquipment: `INVERTER ${i + 1}`,
        values: "0.34 Ω",
        remark: "Good",
      })),
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `e_acspd_${i + 1}`,
        itemEquipment: `AC SPD ${i + 1}`,
        values: "0.29 Ω",
        remark: "Good",
      })),
      {
        id: "e_iso_tx",
        itemEquipment: "ISOLATION TRANSFORMER",
        values: "0.28 Ω",
        remark: "Passed",
      },
      {
        id: "e_dg",
        itemEquipment: "DIESEL GENERATOR",
        values: "0.31 Ω",
        remark: "Passed",
      },
    ],

    equipmentMaintenance: [
      {
        id: "em1",
        name: "AIR CONDITIONER 1",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Filters cleaned",
      },
      {
        id: "em2",
        name: "AIR CONDITIONER 2",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Gas pressure checked",
      },
      {
        id: "em3",
        name: "AIR CONDITIONER 3",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Thermostat calibrated",
      },
      {
        id: "em4",
        name: "FIRE EXTINGUISHER 1",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Gauge in green zone",
      },
      {
        id: "em5",
        name: "FIRE EXTINGUISHER 2",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Inspected and pinned",
      },
      {
        id: "em6",
        name: "FIRE EXTINGUISHER 3",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Ready for use",
      },
      {
        id: "em7",
        name: "FIRE EXTINGUISHER 4",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Ready for use",
      },
      {
        id: "em8",
        name: "Solar farm and surrounding",
        status: "Clean",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Vegetation cleared",
      },
      {
        id: "em9",
        name: "Perimeter fence",
        status: "Secure",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Razor wire intact",
      },
      {
        id: "em10",
        name: "Fire alarm/smoke detector 1",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Battery healthy",
      },
      {
        id: "em11",
        name: "Fire alarm/smoke detector 2",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Tested and functional",
      },
      {
        id: "em12",
        name: "Fire alarm/smoke detector 3",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Tested and functional",
      },
      {
        id: "em13",
        name: "Humidity sensor 1",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Readings nominal",
      },
      {
        id: "em14",
        name: "Humidity sensor 2",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Readings nominal",
      },
      {
        id: "em15",
        name: "Humidity sensor 3",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Readings nominal",
      },
      {
        id: "em16",
        name: "Presense detector",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "PIR motion verified",
      },
      {
        id: "em17",
        name: "Poles conditions",
        status: "Good",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "No leaning detected",
      },
      {
        id: "em18",
        name: "Last mile connection (drop down)",
        status: "Good",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Tension and clamps ok",
      },
    ],

    ppesList: [
      {
        id: "p1",
        name: "Safety Helmet / Hard Hat",
        condition: "Good",
        remark: "6 units on rack",
      },
      {
        id: "p2",
        name: "High-Visibility Safety Vests",
        condition: "Good",
        remark: "8 units available",
      },
      {
        id: "p3",
        name: "Insulated Electrical Boots",
        condition: "Good",
        remark: "4 pairs in locker",
      },
      {
        id: "p4",
        name: "10kV High-Voltage Insulated Gloves",
        condition: "Good",
        remark: "2 pairs inspected",
      },
      {
        id: "p5",
        name: "Safety Goggles / Face Shield",
        condition: "Good",
        remark: "4 units clean",
      },
      {
        id: "p6",
        name: "Ear Plugs / Noise Muffs",
        condition: "Good",
        remark: "5 sets available",
      },
      {
        id: "p7",
        name: "Dust Masks / Respirators",
        condition: "Good",
        remark: "Box available",
      },
      {
        id: "p8",
        name: "Fall Protection Harness",
        condition: "Good",
        remark: "2 sets inspected",
      },
      {
        id: "p9",
        name: "Arc Flash Protection Suit",
        condition: "Good",
        remark: "Complete kit",
      },
      {
        id: "p10",
        name: "Site First Aid Box",
        condition: "Good",
        remark: "Fully stocked",
      },
      {
        id: "p11",
        name: "Non-Contact Voltage Detector",
        condition: "Good",
        remark: "Tested ok",
      },
      {
        id: "p12",
        name: "Lockout / Tagout (LOTO) Kit",
        condition: "Good",
        remark: "Padlocks present",
      },
    ],

    toolsList: [
      {
        id: "t1",
        name: "Digital Multimeter (CAT IV 1000V)",
        condition: "Calibrated",
        remark: "Primary testing meter",
      },
      {
        id: "t2",
        name: "DC/AC Clamp Meter",
        condition: "Good",
        remark: "Current verification",
      },
      {
        id: "t3",
        name: "Insulation Resistance Tester (Megger)",
        condition: "Good",
        remark: "High voltage test",
      },
      {
        id: "t4",
        name: "Earth Ground Resistance Tester",
        condition: "Good",
        remark: "Earthing pit meter",
      },
      {
        id: "t5",
        name: "Calibrated Torque Wrench Set",
        condition: "Good",
        remark: "Terminal torquing",
      },
      {
        id: "t6",
        name: "1000V Insulated Screwdriver Set",
        condition: "Good",
        remark: "Complete set",
      },
      {
        id: "t7",
        name: "MC4 PV Crimping & Extraction Tool",
        condition: "Good",
        remark: "Solar cabling kit",
      },
      {
        id: "t8",
        name: "Solar Irradiance Pyranometer",
        condition: "Good",
        remark: "Solar insolation",
      },
      {
        id: "t9",
        name: "Thermal Imaging IR Camera",
        condition: "Good",
        remark: "Hotspot detection",
      },
      {
        id: "t10",
        name: "Step Ladder (Fiberglass)",
        condition: "Good",
        remark: "Non-conductive",
      },
    ],

    commentOnOperators:
      "Operators demonstrated high adherence to safety protocols and site logs.",
    commentOnSecurityPersonnel:
      "Security personnel present 24/7. Access log book updated daily.",
    commentOnSafetySignage:
      "High voltage warnings and PPE required signs posted clearly across site.",
    commentOnMeteringVendingCustomers:
      "Vending meters communicating properly. Customer vending complaints zero.",
    generalRemark:
      "Overall site infrastructure is in excellent operational state following Q2 comprehensive preventative maintenance.",
  }
}
