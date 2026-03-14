export interface Medicine {
  name: string;
  price: number;
}

export interface LabTest {
  name: string;
  price: number;
}

export const initialMedicines: Medicine[] = [
  { name: "Amoxicillin", price: 15.50 },
  { name: "Lisinopril", price: 12.00 },
  { name: "Atorvastatin", price: 25.00 },
  { name: "Metformin", price: 10.00 },
  { name: "Amlodipine", price: 18.00 },
  { name: "Omeprazole", price: 22.00 },
];

export const initialLabTests: LabTest[] = [
  { name: "Complete Blood Count (CBC)", price: 45.00 },
  { name: "Basic Metabolic Panel (BMP)", price: 60.00 },
  { name: "Lipid Panel", price: 75.00 },
  { name: "Liver Function Test (LFT)", price: 85.00 },
  { name: "Hemoglobin A1c", price: 55.00 },
  { name: "Urinalysis", price: 30.00 },
];
