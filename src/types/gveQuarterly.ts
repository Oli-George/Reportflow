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
      {
        id: "e1",
        itemEquipment: "Perimeter fencing",
        values: "0.45 Ohms",
        remark: "Passed",
      },
      {
        id: "e2",
        itemEquipment: "PV support structure",
        values: "0.38 Ohms",
        remark: "Passed",
      },
      {
        id: "e3",
        itemEquipment: "Power house door",
        values: "0.40 Ohms",
        remark: "Passed",
      },
      {
        id: "e4",
        itemEquipment: "Power house burglary proof",
        values: "0.42 Ohms",
        remark: "Passed",
      },
      {
        id: "e5",
        itemEquipment: "PV INVERTER 1-5",
        values: "0.32 Ohms",
        remark: "Passed",
      },
      {
        id: "e6",
        itemEquipment: "INVERTER 1-15",
        values: "0.35 Ohms",
        remark: "Passed",
      },
      {
        id: "e7",
        itemEquipment: "AC SPD 1-9",
        values: "0.30 Ohms",
        remark: "Passed",
      },
      {
        id: "e8",
        itemEquipment: "ISOLATION TRANSFORMER",
        values: "0.28 Ohms",
        remark: "Passed",
      },
      {
        id: "e9",
        itemEquipment: "DIESEL GENERATOR",
        values: "0.31 Ohms",
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
        name: "FIRE EXTINGUISHER 1-4",
        status: "Active",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Pressure gauge green",
      },
      {
        id: "em4",
        name: "Solar farm & surrounding fence",
        status: "Good",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Weed control done",
      },
      {
        id: "em5",
        name: "Fire alarm & Smoke detectors",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Tested buzzer ok",
      },
      {
        id: "em6",
        name: "Humidity sensors 1-3",
        status: "Operational",
        dateLastMaintained: today,
        dateNextScheduled: today,
        remarks: "Calibrated",
      },
    ],

    ppesList: [
      {
        id: "p1",
        name: "Safety Helmets / Hard Hats",
        condition: "Good",
        remark: "5 units available",
      },
      {
        id: "p2",
        name: "High-Visibility Vests",
        condition: "Good",
        remark: "8 units available",
      },
      {
        id: "p3",
        name: "Insulated Safety Boots",
        condition: "Good",
        remark: "4 pairs in locker",
      },
      {
        id: "p4",
        name: "Electrical Insulated Gloves (10kV)",
        condition: "Good",
        remark: "2 pairs inspected",
      },
    ],

    toolsList: [
      {
        id: "t1",
        name: "Digital Multimeter (CAT IV)",
        condition: "Calibrated",
        remark: "Primary audit meter",
      },
      {
        id: "t2",
        name: "DC Clamp Meter",
        condition: "Good",
        remark: "Operational",
      },
      {
        id: "t3",
        name: "Torque Wrench Set",
        condition: "Good",
        remark: "Complete set in box",
      },
      {
        id: "t4",
        name: "Insulated Screwdriver Set",
        condition: "Good",
        remark: "1000V rated",
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
