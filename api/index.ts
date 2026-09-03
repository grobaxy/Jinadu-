// @ts-nocheck
// api/index.ts
import express2 from "express";
import dotenv from "dotenv";

// server/vtuRoutes.ts
import { Router } from "express";

// src/lib/vtuTypes.ts
var DEFAULT_AIRTIME_DATA_SETTINGS = {
  airtimeEnabled: true,
  dataEnabled: true,
  mtnEnabled: true,
  airtelEnabled: true,
  gloEnabled: true,
  nineMobileEnabled: true,
  gpToNgnRate: 1,
  // 1 GP = 1 NGN
  minAirtimeNGN: 50,
  maxAirtimeNGN: 5e4,
  minDataNGN: 100,
  maxDataNGN: 5e4,
  providerEnvironment: "live"
};
var NETWORK_METADATA = {
  MTN: {
    name: "MTN Nigeria",
    brandColor: "#FFCC00",
    bgColor: "bg-amber-400/10 dark:bg-amber-400/20",
    borderColor: "border-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
    prefixes: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"],
    logoBadge: "\u{1F7E1} MTN"
  },
  AIRTEL: {
    name: "Airtel Nigeria",
    brandColor: "#FF0000",
    bgColor: "bg-red-500/10 dark:bg-red-500/20",
    borderColor: "border-red-500",
    textColor: "text-red-600 dark:text-red-400",
    prefixes: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912", "0911"],
    logoBadge: "\u{1F534} Airtel"
  },
  GLO: {
    name: "Glo Nigeria",
    brandColor: "#008751",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
    borderColor: "border-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    prefixes: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
    logoBadge: "\u{1F7E2} Glo"
  },
  "9MOBILE": {
    name: "9mobile",
    brandColor: "#005D30",
    bgColor: "bg-teal-500/10 dark:bg-teal-500/20",
    borderColor: "border-teal-500",
    textColor: "text-teal-600 dark:text-teal-400",
    prefixes: ["0809", "0818", "0817", "0909", "0908"],
    logoBadge: "\u{1F7E2} 9mobile"
  }
};
function validateNigerianPhone(rawNumber) {
  if (!rawNumber) {
    return { isValid: false, formattedNumber: "", error: "Phone number is required" };
  }
  let cleaned = rawNumber.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+234")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("234")) {
    cleaned = "0" + cleaned.slice(3);
  }
  if (!/^0[789][01]\d{8}$/.test(cleaned)) {
    return {
      isValid: false,
      formattedNumber: cleaned,
      error: "Enter a valid 11-digit Nigerian phone number (e.g. 08012345678)"
    };
  }
  const prefix = cleaned.slice(0, 4);
  let detectedNetwork;
  for (const [net, meta] of Object.entries(NETWORK_METADATA)) {
    if (meta.prefixes.includes(prefix)) {
      detectedNetwork = net;
      break;
    }
  }
  return {
    isValid: true,
    formattedNumber: cleaned,
    detectedNetwork
  };
}
var DEFAULT_NIGERIAN_DATA_BUNDLES = [
  {
    "id": "mtn_303_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "303",
    "productName": "1GB (AWOOF) MTN Special",
    "amountNGN": 270,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_14_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "14",
    "productName": "500MB (CG)",
    "amountNGN": 320,
    "dataVolume": "500MB",
    "validity": "7 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_15_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "15",
    "productName": "1GB (CG)",
    "amountNGN": 425,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_16_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "16",
    "productName": "2GB (CG)",
    "amountNGN": 850,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_17_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "17",
    "productName": "3GB (CG)",
    "amountNGN": 1275,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_18_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "18",
    "productName": "5GB (CG)",
    "amountNGN": 1950,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_19_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "19",
    "productName": "500MB (SME)",
    "amountNGN": 500,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_20_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "20",
    "productName": "1GB (SME)",
    "amountNGN": 840,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_21_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "21",
    "productName": "1.5GB (SME)",
    "amountNGN": 1e3,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_22_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "22",
    "productName": "2GB (SME)",
    "amountNGN": 1500,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_23_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "23",
    "productName": "3.5GB (SME)",
    "amountNGN": 2500,
    "dataVolume": "3.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_24_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "24",
    "productName": "6GB (SME)",
    "amountNGN": 2500,
    "dataVolume": "6GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_25_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "25",
    "productName": "7GB (SME)",
    "amountNGN": 3500,
    "dataVolume": "7GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_26_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "26",
    "productName": "10GB (SME)",
    "amountNGN": 4500,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_54_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "54",
    "productName": "1GB (AWOOF Special)",
    "amountNGN": 270,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_308_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "308",
    "productName": "1GB (AWOOF)",
    "amountNGN": 500,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_57_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "57",
    "productName": "3.2GB (AWOOF)",
    "amountNGN": 1050,
    "dataVolume": "3.2GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_312_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "312",
    "productName": "5.5GB (AWOOF)",
    "amountNGN": 1500,
    "dataVolume": "5.5GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_313_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "313",
    "productName": "7GB (AWOOF)",
    "amountNGN": 1850,
    "dataVolume": "7GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_58_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "58",
    "productName": "11GB (AWOOF)",
    "amountNGN": 3500,
    "dataVolume": "11GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_314_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "314",
    "productName": "20GB (AWOOF)",
    "amountNGN": 5e3,
    "dataVolume": "20GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_364_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "364",
    "productName": "75MB (GIFTING)",
    "amountNGN": 80,
    "dataVolume": "75MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_302_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "302",
    "productName": "110MB",
    "amountNGN": 100,
    "dataVolume": "110MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_332_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "332",
    "productName": "230MB",
    "amountNGN": 200,
    "dataVolume": "230MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_301_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "301",
    "productName": "500MB",
    "amountNGN": 350,
    "dataVolume": "500MB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_333_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "333",
    "productName": "600MB + 2 Mins",
    "amountNGN": 500,
    "dataVolume": "600MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_300_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "300",
    "productName": "1GB Daily + 1.5 Mins",
    "amountNGN": 500,
    "dataVolume": "1GB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_285_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "285",
    "productName": "1.5GB",
    "amountNGN": 600,
    "dataVolume": "1.5GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_274_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "274",
    "productName": "2.5GB",
    "amountNGN": 750,
    "dataVolume": "2.5GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_297_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "297",
    "productName": "2GB",
    "amountNGN": 750,
    "dataVolume": "2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_283_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "283",
    "productName": "3.2GB",
    "amountNGN": 1e3,
    "dataVolume": "3.2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_281_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "281",
    "productName": "1.5GB Monthly",
    "amountNGN": 1e3,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_315_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "315",
    "productName": "1GB Monthly",
    "amountNGN": 1e3,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_271_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "271",
    "productName": "4GB",
    "amountNGN": 1200,
    "dataVolume": "4GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_270_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "270",
    "productName": "5.5GB",
    "amountNGN": 1500,
    "dataVolume": "5.5GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_323_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "323",
    "productName": "7GB",
    "amountNGN": 1800,
    "dataVolume": "7GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_329_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "329",
    "productName": "3GB Monthly",
    "amountNGN": 2e3,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_319_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "319",
    "productName": "5GB Monthly",
    "amountNGN": 2500,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_320_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "320",
    "productName": "6GB Monthly",
    "amountNGN": 2500,
    "dataVolume": "6GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_286_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "286",
    "productName": "7GB Monthly",
    "amountNGN": 3500,
    "dataVolume": "7GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_290_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "290",
    "productName": "11GB Monthly",
    "amountNGN": 3500,
    "dataVolume": "11GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_327_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "327",
    "productName": "15GB Monthly",
    "amountNGN": 4e3,
    "dataVolume": "15GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_273_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "273",
    "productName": "20GB Monthly",
    "amountNGN": 5e3,
    "dataVolume": "20GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_325_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "325",
    "productName": "18GB Monthly",
    "amountNGN": 6e3,
    "dataVolume": "18GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_328_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "328",
    "productName": "28GB Monthly",
    "amountNGN": 8e3,
    "dataVolume": "28GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_324_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "324",
    "productName": "40GB Monthly",
    "amountNGN": 1e4,
    "dataVolume": "40GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_89_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "89",
    "productName": "500MB (CG)",
    "amountNGN": 500,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_90_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "90",
    "productName": "1GB (CG)",
    "amountNGN": 830,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_91_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "91",
    "productName": "1.5GB (CG)",
    "amountNGN": 1e3,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_92_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "92",
    "productName": "2GB (CG)",
    "amountNGN": 1500,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_94_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "94",
    "productName": "3.5GB (CG)",
    "amountNGN": 1500,
    "dataVolume": "3.5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_93_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "93",
    "productName": "3GB (CG)",
    "amountNGN": 2e3,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_95_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "95",
    "productName": "4GB (CG)",
    "amountNGN": 2500,
    "dataVolume": "4GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_96_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "96",
    "productName": "6GB (CG)",
    "amountNGN": 2500,
    "dataVolume": "6GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_97_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "97",
    "productName": "8GB (CG)",
    "amountNGN": 3e3,
    "dataVolume": "8GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_98_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "98",
    "productName": "10GB (CG)",
    "amountNGN": 3e3,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_99_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "99",
    "productName": "10GB (CG - Extended)",
    "amountNGN": 4e3,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_100_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "100",
    "productName": "13GB (CG)",
    "amountNGN": 5e3,
    "dataVolume": "13GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_101_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "101",
    "productName": "18GB (CG)",
    "amountNGN": 5e3,
    "dataVolume": "18GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_103_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "103",
    "productName": "25GB (CG)",
    "amountNGN": 8e3,
    "dataVolume": "25GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_121_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "121",
    "productName": "150MB (AWOOF)",
    "amountNGN": 67,
    "dataVolume": "150MB",
    "validity": "1 Day",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_122_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "122",
    "productName": "300MB (AWOOF)",
    "amountNGN": 125,
    "dataVolume": "300MB",
    "validity": "1 Day",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_123_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "123",
    "productName": "600MB (AWOOF)",
    "amountNGN": 230,
    "dataVolume": "600MB",
    "validity": "2 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_124_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "124",
    "productName": "1.5GB (AWOOF)",
    "amountNGN": 440,
    "dataVolume": "1.5GB",
    "validity": "7 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_125_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "125",
    "productName": "2GB (AWOOF)",
    "amountNGN": 550,
    "dataVolume": "2GB",
    "validity": "7 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_126_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "126",
    "productName": "3GB (AWOOF)",
    "amountNGN": 810,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_127_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "127",
    "productName": "10GB (AWOOF)",
    "amountNGN": 3120,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_212_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "212",
    "productName": "250MB Night Plan (12 - 5 AM)",
    "amountNGN": 50,
    "dataVolume": "250MB",
    "validity": "1 Night",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_198_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "198",
    "productName": "75MB Daily Plan",
    "amountNGN": 75,
    "dataVolume": "75MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_189_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "189",
    "productName": "110MB Plan",
    "amountNGN": 100,
    "dataVolume": "110MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_211_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "211",
    "productName": "200MB Social Plan",
    "amountNGN": 100,
    "dataVolume": "200MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_210_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "210",
    "productName": "1GB Social Plan",
    "amountNGN": 300,
    "dataVolume": "1GB",
    "validity": "3 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_362_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "362",
    "productName": "1GB Binge Plan",
    "amountNGN": 500,
    "dataVolume": "1GB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_215_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "215",
    "productName": "2GB Binge Plan + Youtube",
    "amountNGN": 600,
    "dataVolume": "2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_197_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "197",
    "productName": "3GB Binge Plan + Youtube",
    "amountNGN": 750,
    "dataVolume": "3GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_209_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "209",
    "productName": "1GB Plan (7 Days)",
    "amountNGN": 800,
    "dataVolume": "1GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_196_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "196",
    "productName": "1.5GB Weekly Plan",
    "amountNGN": 1e3,
    "dataVolume": "1.5GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_204_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "204",
    "productName": "4GB Binge Plan",
    "amountNGN": 1e3,
    "dataVolume": "4GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_216_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "216",
    "productName": "6GB Binge Plan",
    "amountNGN": 1500,
    "dataVolume": "6GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_195_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "195",
    "productName": "2GB Plan (30 Days)",
    "amountNGN": 1500,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_207_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "207",
    "productName": "3GB Monthly Plan",
    "amountNGN": 2e3,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_194_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "194",
    "productName": "4GB Monthly Plan",
    "amountNGN": 2500,
    "dataVolume": "4GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_192_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "192",
    "productName": "8GB Monthly Plan",
    "amountNGN": 3e3,
    "dataVolume": "8GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_214_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "214",
    "productName": "10GB Monthly Plan",
    "amountNGN": 4e3,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_191_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "191",
    "productName": "13GB Monthly Plan",
    "amountNGN": 5e3,
    "dataVolume": "13GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_205_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "205",
    "productName": "18GB Monthly Plan",
    "amountNGN": 6e3,
    "dataVolume": "18GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_199_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "199",
    "productName": "25GB Monthly Plan",
    "amountNGN": 8e3,
    "dataVolume": "25GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_203_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "203",
    "productName": "35GB Monthly Plan",
    "amountNGN": 1e4,
    "dataVolume": "35GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_202_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "202",
    "productName": "60GB Monthly Plan",
    "amountNGN": 15e3,
    "dataVolume": "60GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_201_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "201",
    "productName": "100GB Monthly Plan",
    "amountNGN": 2e4,
    "dataVolume": "100GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_59_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "59",
    "productName": "200MB (CG)",
    "amountNGN": 92,
    "dataVolume": "200MB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_60_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "60",
    "productName": "500MB (CG)",
    "amountNGN": 215,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_61_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "61",
    "productName": "1GB (CG)",
    "amountNGN": 380,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_64_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "64",
    "productName": "2GB (CG)",
    "amountNGN": 900,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_65_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "65",
    "productName": "3GB (CG)",
    "amountNGN": 1150,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_68_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "68",
    "productName": "5GB (CG)",
    "amountNGN": 1920,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_71_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "71",
    "productName": "10GB (CG)",
    "amountNGN": 4500,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_85_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "85",
    "productName": "750MB (AWOOF)",
    "amountNGN": 210,
    "dataVolume": "750MB",
    "validity": "1 Day",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_86_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "86",
    "productName": "1.5GB (AWOOF)",
    "amountNGN": 330,
    "dataVolume": "1.5GB",
    "validity": "2 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_87_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "87",
    "productName": "2.5GB (AWOOF)",
    "amountNGN": 535,
    "dataVolume": "2.5GB",
    "validity": "7 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_88_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "88",
    "productName": "10GB (AWOOF)",
    "amountNGN": 1980,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_220_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "220",
    "productName": "135MB Social Bundle",
    "amountNGN": 50,
    "dataVolume": "135MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_222_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "222",
    "productName": "350MB Night Plan",
    "amountNGN": 60,
    "dataVolume": "350MB",
    "validity": "1 Night",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_219_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "219",
    "productName": "335MB Social Bundle",
    "amountNGN": 100,
    "dataVolume": "335MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_268_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "268",
    "productName": "125MB (1 Day)",
    "amountNGN": 100,
    "dataVolume": "125MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_221_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "221",
    "productName": "750MB Night Plan",
    "amountNGN": 120,
    "dataVolume": "750MB",
    "validity": "1 Night",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_267_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "267",
    "productName": "275MB",
    "amountNGN": 200,
    "dataVolume": "275MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_243_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "243",
    "productName": "2.5GB",
    "amountNGN": 500,
    "dataVolume": "2.5GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_244_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "244",
    "productName": "2GB Special",
    "amountNGN": 500,
    "dataVolume": "2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_238_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "238",
    "productName": "3.55GB Special Plan",
    "amountNGN": 600,
    "dataVolume": "3.55GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_245_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "245",
    "productName": "1.1GB",
    "amountNGN": 750,
    "dataVolume": "1.1GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_237_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "237",
    "productName": "5.1GB Special Plan",
    "amountNGN": 1e3,
    "dataVolume": "5.1GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_265_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "265",
    "productName": "2.6GB",
    "amountNGN": 1e3,
    "dataVolume": "2.6GB",
    "validity": "14 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_248_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "248",
    "productName": "5.2GB",
    "amountNGN": 1500,
    "dataVolume": "5.2GB",
    "validity": "14 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_250_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "250",
    "productName": "6GB Special",
    "amountNGN": 1500,
    "dataVolume": "6GB",
    "validity": "14 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_247_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "247",
    "productName": "9GB",
    "amountNGN": 2e3,
    "dataVolume": "9GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_264_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "264",
    "productName": "6.25GB",
    "amountNGN": 2e3,
    "dataVolume": "6.25GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_262_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "262",
    "productName": "10.5GB",
    "amountNGN": 3e3,
    "dataVolume": "10.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_261_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "261",
    "productName": "12.5GB",
    "amountNGN": 4e3,
    "dataVolume": "12.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_260_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "260",
    "productName": "17GB",
    "amountNGN": 5e3,
    "dataVolume": "17GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_259_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "259",
    "productName": "28GB",
    "amountNGN": 8e3,
    "dataVolume": "28GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_258_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "258",
    "productName": "42GB",
    "amountNGN": 1e4,
    "dataVolume": "42GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_128_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "128",
    "productName": "500MB (SME)",
    "amountNGN": 260,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_129_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "129",
    "productName": "1GB (SME)",
    "amountNGN": 515,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_130_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "130",
    "productName": "1.5GB (SME)",
    "amountNGN": 750,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_131_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "131",
    "productName": "2GB (SME)",
    "amountNGN": 1030,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_132_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "132",
    "productName": "3GB (SME)",
    "amountNGN": 1545,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_133_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "133",
    "productName": "4GB (SME)",
    "amountNGN": 2060,
    "dataVolume": "4GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_134_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "134",
    "productName": "4.5GB (SME)",
    "amountNGN": 2180,
    "dataVolume": "4.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_135_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "135",
    "productName": "5GB (SME)",
    "amountNGN": 2575,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_136_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "136",
    "productName": "7.5GB (SME)",
    "amountNGN": 3700,
    "dataVolume": "7.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_137_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "137",
    "productName": "10GB (SME)",
    "amountNGN": 5150,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_138_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "138",
    "productName": "11GB (SME)",
    "amountNGN": 5665,
    "dataVolume": "11GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_139_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "139",
    "productName": "15GB (SME)",
    "amountNGN": 7725,
    "dataVolume": "15GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_140_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "140",
    "productName": "20GB (SME)",
    "amountNGN": 10300,
    "dataVolume": "20GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_188_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "188",
    "productName": "40MB (24 Hours)",
    "amountNGN": 50,
    "dataVolume": "40MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_187_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "187",
    "productName": "83MB (1 Day)",
    "amountNGN": 100,
    "dataVolume": "83MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_178_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "178",
    "productName": "150MB + 100MB Night",
    "amountNGN": 150,
    "dataVolume": "250MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_177_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "177",
    "productName": "200MB Social Plan",
    "amountNGN": 200,
    "dataVolume": "200MB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_186_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "186",
    "productName": "650MB (7 Days)",
    "amountNGN": 500,
    "dataVolume": "650MB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_185_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "185",
    "productName": "2GB Anytime (30 Days)",
    "amountNGN": 1e3,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_181_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "181",
    "productName": "2.3GB Anytime (30 Days)",
    "amountNGN": 1200,
    "dataVolume": "2.3GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_180_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "180",
    "productName": "4.5GB Anytime (30 Days)",
    "amountNGN": 2e3,
    "dataVolume": "4.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_179_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "179",
    "productName": "5.2GB Anytime (30 Days)",
    "amountNGN": 2500,
    "dataVolume": "5.2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_184_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "184",
    "productName": "6.2GB Anytime (30 Days)",
    "amountNGN": 3e3,
    "dataVolume": "6.2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_183_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "183",
    "productName": "8.4GB Anytime (30 Days)",
    "amountNGN": 4e3,
    "dataVolume": "8.4GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_182_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "182",
    "productName": "11.4GB Anytime (30 Days)",
    "amountNGN": 5e3,
    "dataVolume": "11.4GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  }
];
function getAirtimeRedemptionWindowStatus(date = /* @__PURE__ */ new Date()) {
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const totalSecondsInHour = minutes * 60 + seconds;
  const windowLimitSeconds = 15 * 60;
  const isOpen = totalSecondsInHour < windowLimitSeconds;
  const secondsRemainingInWindow = isOpen ? windowLimitSeconds - totalSecondsInHour : 0;
  const minutesRemainingInWindow = Math.ceil(secondsRemainingInWindow / 60);
  const secondsUntilNextWindow = isOpen ? 0 : 3600 - totalSecondsInHour;
  const minutesUntilNextWindow = Math.ceil(secondsUntilNextWindow / 60);
  const nextHourDate = new Date(date.getTime() + secondsUntilNextWindow * 1e3);
  const formatTime = (d) => {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };
  return {
    isOpen,
    minutesIntoHour: minutes,
    secondsIntoHour: seconds,
    minutesRemainingInWindow,
    secondsRemainingInWindow,
    minutesUntilNextWindow,
    secondsUntilNextWindow,
    formattedCurrentTime: formatTime(date),
    formattedNextWindowTime: formatTime(nextHourDate),
    scheduleDescription: "Free users can redeem only during the first 15 minutes of each hour (:00 - :15)."
  };
}

// server/vtuProvider.ts
function extractPairgateErrorMessage(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw === "string") return raw;
  if (raw.message && typeof raw.message === "string") return raw.message;
  if (raw.error && typeof raw.error === "string") return raw.error;
  if (raw.msg && typeof raw.msg === "string") return raw.msg;
  if (raw.detail && typeof raw.detail === "string") return raw.detail;
  if (raw.data?.message && typeof raw.data.message === "string") return raw.data.message;
  if (raw.errors) {
    if (typeof raw.errors === "string") return raw.errors;
    if (Array.isArray(raw.errors)) return raw.errors.join(", ");
    if (typeof raw.errors === "object") {
      const vals = Object.values(raw.errors).flat();
      return vals.map((v) => String(v)).join("; ");
    }
  }
  return fallback;
}
var VtuProviderService = class {
  constructor() {
    this.defaultEnvironment = process.env.PAIRGATE_ENVIRONMENT || "live";
  }
  getApiKey() {
    return (process.env.PAIRGATE_API_KEY || process.env.VTU_API_KEY || "PG_live_HK8oBfwCCfsTyIyMhcdCSNgpfDzXdPwdpJRq74iJUZ7M3").trim();
  }
  getBaseUrl() {
    return (process.env.PAIRGATE_BASE_URL || process.env.VTU_BASE_URL || "https://pairgate.com/api/v1").replace(/\/+$/, "").trim();
  }
  getEnvironment(override) {
    return override || process.env.PAIRGATE_ENVIRONMENT || this.defaultEnvironment;
  }
  async getProviderBalance(env) {
    const environment = this.getEnvironment(env);
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8e3);
      const response = await fetch(`${baseUrl}/wallet/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Cache-Control": "no-cache",
          Accept: "application/json"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const json = await response.json().catch(() => null);
        const rawBalance = json?.data?.balance ?? json?.balance;
        if (rawBalance !== void 0 && rawBalance !== null && !isNaN(Number(rawBalance))) {
          const numBalance = Number(rawBalance);
          return {
            success: true,
            balanceNGN: numBalance,
            currency: json?.data?.currency || "NGN",
            environment,
            provider: "pairgate",
            retrievedAt: json?.data?.retrieved_at || (/* @__PURE__ */ new Date()).toISOString(),
            raw: json
          };
        }
      }
    } catch (_err) {
    }
    if (environment === "sandbox") {
      return {
        success: true,
        balanceNGN: 15e5,
        currency: "NGN",
        environment: "sandbox",
        provider: "pairgate_sandbox"
      };
    }
    return {
      success: false,
      balanceNGN: 0,
      currency: "NGN",
      environment: "live",
      provider: "pairgate"
    };
  }
  getDataPlans(network, planType) {
    let plans = DEFAULT_NIGERIAN_DATA_BUNDLES;
    if (network) {
      plans = plans.filter((p) => p.network.toUpperCase() === network.toUpperCase());
    }
    if (planType && planType.toUpperCase() !== "ALL") {
      plans = plans.filter(
        (p) => (p.category || p.planType || "").toUpperCase() === planType.toUpperCase()
      );
    }
    return plans;
  }
  /**
   * Purchase Airtime for Nigerian phone numbers
   */
  async purchaseAirtime(params) {
    const { network, phoneNumber, amountNGN, reference } = params;
    const environment = this.getEnvironment(params.environment);
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const isSandbox = environment === "sandbox";
    const endpoint = isSandbox ? `${baseUrl}/test/airtime/purchase` : `${baseUrl}/airtime/purchase`;
    try {
      const payload = {
        provider_id: network.toLowerCase(),
        amount: Number(amountNGN),
        recipient: phoneNumber,
        reference
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18e3);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const raw = await response.json().catch(() => null);
      if (response.ok && (raw?.code === 200 || raw?.status === "success" || raw?.status === true)) {
        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: raw?.data?.transaction_id || raw?.data?.id || raw?.data?.reference || `PG_${Date.now()}`,
          reference,
          network,
          phoneNumber,
          amountNGN,
          message: raw?.message || raw?.data?.message || `\u20A6${amountNGN.toLocaleString()} Airtime delivered to ${phoneNumber} (${network}).`,
          rawResponse: raw
        };
      } else if (raw?.status === "pending" || raw?.status === "processing") {
        return {
          success: true,
          status: "PENDING",
          providerTransactionId: raw?.data?.transaction_id || raw?.data?.id || `PG_PEND_${Date.now()}`,
          reference,
          network,
          phoneNumber,
          amountNGN,
          message: raw?.message || "Transaction submitted to telecom operator and is processing.",
          rawResponse: raw
        };
      } else {
        const errorMsg = extractPairgateErrorMessage(raw, "Telecom operator failed to process airtime.");
        return {
          success: false,
          status: "FAILED",
          providerTransactionId: raw?.data?.transaction_id || `PG_ERR_${Date.now()}`,
          reference,
          network,
          phoneNumber,
          amountNGN,
          message: errorMsg,
          rawResponse: raw
        };
      }
    } catch (err) {
      return {
        success: false,
        status: "FAILED",
        providerTransactionId: `PG_ERR_${Date.now()}`,
        reference,
        network,
        phoneNumber,
        amountNGN,
        message: err?.name === "AbortError" ? "Provider gateway timed out" : err?.message || "Network communication error with VTU provider"
      };
    }
  }
  /**
   * Purchase Mobile Data for Nigerian phone numbers
   */
  async purchaseData(params) {
    const { network, phoneNumber, planCode, amountNGN, reference } = params;
    const environment = this.getEnvironment(params.environment);
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const isSandbox = environment === "sandbox";
    const endpoint = isSandbox ? `${baseUrl}/test/data/purchase` : `${baseUrl}/data/purchase`;
    try {
      const payload = {
        provider_id: network.toLowerCase(),
        plan_id: String(planCode),
        recipient: phoneNumber,
        reference
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18e3);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const raw = await response.json().catch(() => null);
      if (response.ok && (raw?.code === 200 || raw?.status === "success" || raw?.status === true)) {
        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: raw?.data?.transaction_id || raw?.data?.id || raw?.data?.reference || `PG_DATA_${Date.now()}`,
          reference,
          network,
          phoneNumber,
          amountNGN,
          message: raw?.message || raw?.data?.message || `Mobile data bundle successfully activated for ${phoneNumber} (${network}).`,
          rawResponse: raw
        };
      } else if (raw?.status === "pending" || raw?.status === "processing") {
        return {
          success: true,
          status: "PENDING",
          providerTransactionId: raw?.data?.transaction_id || raw?.data?.id || `PG_DATA_PEND_${Date.now()}`,
          reference,
          network,
          phoneNumber,
          amountNGN,
          message: raw?.message || "Data order is processing with telecom operator.",
          rawResponse: raw
        };
      } else {
        const errorMsg = extractPairgateErrorMessage(raw, "Telecom operator failed to fulfill data order.");
        return {
          success: false,
          status: "FAILED",
          providerTransactionId: raw?.data?.transaction_id || `PG_DATA_ERR_${Date.now()}`,
          reference,
          network,
          phoneNumber,
          amountNGN,
          message: errorMsg,
          rawResponse: raw
        };
      }
    } catch (err) {
      return {
        success: false,
        status: "FAILED",
        providerTransactionId: `PG_DATA_ERR_${Date.now()}`,
        reference,
        network,
        phoneNumber,
        amountNGN,
        message: err?.name === "AbortError" ? "Provider gateway timed out" : err?.message || "Network communication error with VTU provider"
      };
    }
  }
  /**
   * Re-query transaction status directly from provider
   */
  async requeryTransaction(params) {
    const { reference, providerTransactionId } = params;
    const environment = this.getEnvironment(params.environment);
    if (environment === "sandbox") {
      return {
        status: "SUCCESS",
        message: "Sandbox Simulated: Transaction confirmed as successful on telecom network.",
        rawResponse: { status: "success", reference, confirmedAt: (/* @__PURE__ */ new Date()).toISOString() }
      };
    }
    try {
      const apiKey = this.getApiKey();
      const baseUrl = this.getBaseUrl();
      const queryParam = providerTransactionId ? `id=${encodeURIComponent(providerTransactionId)}` : `reference=${encodeURIComponent(reference)}`;
      const response = await fetch(`${baseUrl}/bills/status?${queryParam}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        return {
          status: "PENDING",
          message: "Unable to fetch status update from provider. Will retry automatically."
        };
      }
      const raw = await response.json();
      const statusRaw = (raw?.data?.status || raw?.status || "").toLowerCase();
      if (statusRaw === "success" || statusRaw === "completed" || statusRaw === "successful") {
        return {
          status: "SUCCESS",
          message: raw?.message || "Transaction confirmed delivered by provider.",
          rawResponse: raw
        };
      } else if (statusRaw === "failed" || statusRaw === "reversed" || statusRaw === "cancelled") {
        return {
          status: "FAILED",
          message: raw?.message || "Transaction failed or reversed by operator.",
          rawResponse: raw
        };
      } else {
        return {
          status: "PENDING",
          message: "Transaction is still processing with operator.",
          rawResponse: raw
        };
      }
    } catch (err) {
      return {
        status: "PENDING",
        message: "Network error during requery: " + (err?.message || "Unknown error")
      };
    }
  }
};
var vtuProvider = new VtuProviderService();

// server/vtuRoutes.ts
var vtuRouter = Router();
var currentSettings = { ...DEFAULT_AIRTIME_DATA_SETTINGS };
var inMemoryTransactions = /* @__PURE__ */ new Map();
var inMemoryAuditLogs = [];
var processedIdempotencyKeys = /* @__PURE__ */ new Set();
function logAudit(entry) {
  const log = {
    ...entry,
    id: `vtu_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  inMemoryAuditLogs.unshift(log);
  if (inMemoryAuditLogs.length > 500) {
    inMemoryAuditLogs.pop();
  }
  return log;
}
vtuRouter.get("/settings", (_req, res) => {
  const redemptionWindow = getAirtimeRedemptionWindowStatus();
  return res.json({
    success: true,
    serverTime: (/* @__PURE__ */ new Date()).toISOString(),
    redemptionWindow,
    settings: {
      airtimeEnabled: currentSettings.airtimeEnabled,
      dataEnabled: currentSettings.dataEnabled,
      mtnEnabled: currentSettings.mtnEnabled,
      airtelEnabled: currentSettings.airtelEnabled,
      gloEnabled: currentSettings.gloEnabled,
      nineMobileEnabled: currentSettings.nineMobileEnabled,
      gpToNgnRate: currentSettings.gpToNgnRate,
      minAirtimeNGN: currentSettings.minAirtimeNGN,
      maxAirtimeNGN: currentSettings.maxAirtimeNGN,
      minDataNGN: currentSettings.minDataNGN,
      maxDataNGN: currentSettings.maxDataNGN,
      providerEnvironment: currentSettings.providerEnvironment
    }
  });
});
vtuRouter.get("/data-plans", (req, res) => {
  const network = req.query.network?.toUpperCase();
  const planType = req.query.planType || req.query.category || req.query.type;
  const plans = vtuProvider.getDataPlans(network, planType);
  const rate = currentSettings.gpToNgnRate > 0 ? currentSettings.gpToNgnRate : 1;
  const plansWithGp = plans.map((p) => ({
    ...p,
    requiredGp: Math.ceil(p.amountNGN / rate)
  }));
  return res.json({
    success: true,
    plans: plansWithGp,
    gpToNgnRate: rate
  });
});
vtuRouter.post("/purchase", async (req, res) => {
  try {
    const {
      userId,
      userName = "Scholar",
      userEmail = "",
      userAvatar = "",
      serviceType = "airtime",
      network,
      phoneNumber,
      amountNGN,
      gpAmount,
      productCode,
      productName,
      idempotencyKey,
      membershipTier,
      subscriptionTier,
      isPremium,
      userRole,
      userPlan
    } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    if (!network || !phoneNumber || !amountNGN || !gpAmount || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required purchase parameters (network, phoneNumber, amountNGN, gpAmount, idempotencyKey)"
      });
    }
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      const existing = Array.from(inMemoryTransactions.values()).find((t) => t.idempotencyKey === idempotencyKey);
      if (existing) {
        return res.json({
          success: existing.status === "SUCCESS" || existing.status === "PENDING",
          transaction: existing,
          isDuplicate: true,
          message: `Duplicate request ignored. Current status: ${existing.status}`
        });
      }
    }
    processedIdempotencyKeys.add(idempotencyKey);
    const mTier = String(membershipTier || "").toLowerCase();
    const sTier = String(subscriptionTier || "").toLowerCase();
    const uPlan = String(userPlan || "").toLowerCase();
    const isExempt = Boolean(
      isPremium === true || mTier.includes("premium") || mTier.includes("vip") || mTier.includes("titan") || mTier.includes("pro") || mTier.includes("annual") || sTier.includes("premium") || sTier.includes("vip") || sTier.includes("titan") || sTier.includes("pro") || sTier.includes("annual") || uPlan.includes("premium") || uPlan.includes("vip") || uPlan.includes("titan") || uPlan.includes("pro") || uPlan.includes("annual") || userRole === "admin" || userRole === "super_admin" || userRole === "staff" || userRole === "community_manager"
    );
    if (!isExempt) {
      const windowStatus = getAirtimeRedemptionWindowStatus();
      if (!windowStatus.isOpen) {
        return res.status(403).json({
          success: false,
          code: "REDEMPTION_WINDOW_CLOSED",
          message: "Redemption window is closed. Free users can redeem only during the first 15 minutes of each hour. Upgrade to Premium or VIP to redeem airtime & data anytime.",
          windowStatus
        });
      }
    }
    if (serviceType === "airtime" && !currentSettings.airtimeEnabled) {
      return res.status(403).json({ success: false, message: "Airtime recharge service is currently disabled by Admin." });
    }
    if (serviceType === "data" && !currentSettings.dataEnabled) {
      return res.status(403).json({ success: false, message: "Mobile data service is currently disabled by Admin." });
    }
    const netKey = network.toUpperCase();
    if (netKey === "MTN" && !currentSettings.mtnEnabled) {
      return res.status(403).json({ success: false, message: "MTN network service is temporarily unavailable." });
    }
    if (netKey === "AIRTEL" && !currentSettings.airtelEnabled) {
      return res.status(403).json({ success: false, message: "Airtel network service is temporarily unavailable." });
    }
    if (netKey === "GLO" && !currentSettings.gloEnabled) {
      return res.status(403).json({ success: false, message: "Glo network service is temporarily unavailable." });
    }
    if (netKey === "9MOBILE" && !currentSettings.nineMobileEnabled) {
      return res.status(403).json({ success: false, message: "9mobile network service is temporarily unavailable." });
    }
    const phoneValidation = validateNigerianPhone(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.error || "Invalid Nigerian phone number format." });
    }
    const numAmount = Number(amountNGN);
    const numGp = Number(gpAmount);
    if (serviceType === "airtime") {
      if (numAmount < currentSettings.minAirtimeNGN || numAmount > currentSettings.maxAirtimeNGN) {
        return res.status(400).json({
          success: false,
          message: `Airtime amount must be between \u20A6${currentSettings.minAirtimeNGN.toLocaleString()} and \u20A6${currentSettings.maxAirtimeNGN.toLocaleString()}`
        });
      }
    } else {
      if (numAmount < currentSettings.minDataNGN || numAmount > currentSettings.maxDataNGN) {
        return res.status(400).json({
          success: false,
          message: `Data plan amount must be between \u20A6${currentSettings.minDataNGN.toLocaleString()} and \u20A6${currentSettings.maxDataNGN.toLocaleString()}`
        });
      }
    }
    const expectedGp = Math.ceil(numAmount / currentSettings.gpToNgnRate);
    if (numGp < expectedGp) {
      return res.status(400).json({
        success: false,
        message: `Insufficient GP specified. Required: ${expectedGp} GP at rate 1 GP = \u20A6${currentSettings.gpToNgnRate}.`
      });
    }
    const transactionId = `GBX_VTU_${Date.now()}_${Math.floor(1e3 + Math.random() * 9e3)}`;
    const transactionRecord = {
      id: transactionId,
      transactionId,
      userId,
      userName,
      userEmail,
      userAvatar,
      serviceType,
      phoneNumber: phoneValidation.formattedNumber,
      network: netKey,
      productCode,
      productName: productName || (serviceType === "airtime" ? `${netKey} \u20A6${numAmount} Airtime` : `${netKey} Mobile Data`),
      amountNGN: numAmount,
      gpAmount: numGp,
      status: "PENDING",
      provider: "pairgate",
      idempotencyKey,
      refundStatus: "NONE",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryTransactions.set(transactionId, transactionRecord);
    logAudit({
      transactionId,
      userId,
      userName,
      action: "GP_RESERVED",
      details: {
        amountNGN: numAmount,
        gpAmount: numGp,
        serviceType,
        network: netKey,
        phoneNumber: phoneValidation.formattedNumber,
        rate: currentSettings.gpToNgnRate
      },
      status: "PENDING"
    });
    let providerResult;
    if (serviceType === "airtime") {
      providerResult = await vtuProvider.purchaseAirtime({
        network: netKey,
        phoneNumber: phoneValidation.formattedNumber,
        amountNGN: numAmount,
        reference: transactionId,
        environment: currentSettings.providerEnvironment
      });
    } else {
      providerResult = await vtuProvider.purchaseData({
        network: netKey,
        phoneNumber: phoneValidation.formattedNumber,
        planCode: productCode || `${netKey}_DATA`,
        amountNGN: numAmount,
        reference: transactionId,
        environment: currentSettings.providerEnvironment
      });
    }
    if (providerResult.status === "SUCCESS") {
      transactionRecord.status = "SUCCESS";
      transactionRecord.providerTransactionId = providerResult.providerTransactionId;
      transactionRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      transactionRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, transactionRecord);
      logAudit({
        transactionId,
        userId,
        userName,
        action: "TRANSACTION_SUCCESS",
        details: {
          providerTransactionId: providerResult.providerTransactionId,
          message: providerResult.message
        },
        status: "SUCCESS"
      });
      return res.json({
        success: true,
        status: "SUCCESS",
        message: providerResult.message,
        transaction: transactionRecord
      });
    } else if (providerResult.status === "PENDING") {
      transactionRecord.status = "PENDING";
      transactionRecord.providerTransactionId = providerResult.providerTransactionId;
      transactionRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, transactionRecord);
      logAudit({
        transactionId,
        userId,
        userName,
        action: "PROVIDER_RESPONSE_RECEIVED",
        details: {
          providerTransactionId: providerResult.providerTransactionId,
          message: providerResult.message
        },
        status: "PENDING"
      });
      return res.json({
        success: true,
        status: "PENDING",
        message: providerResult.message || "Transaction is being processed by the telecom network.",
        transaction: transactionRecord
      });
    } else {
      transactionRecord.status = "FAILED";
      transactionRecord.failureReason = providerResult.message || "Provider or operator error";
      transactionRecord.refundStatus = "REFUNDED";
      transactionRecord.refundTransactionId = `REF_${transactionId}`;
      transactionRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, transactionRecord);
      logAudit({
        transactionId,
        userId,
        userName,
        action: "GP_REFUNDED",
        details: {
          failureReason: transactionRecord.failureReason,
          refundedGp: numGp,
          refundTransactionId: transactionRecord.refundTransactionId
        },
        status: "REFUNDED"
      });
      return res.status(400).json({
        success: false,
        status: "FAILED",
        message: providerResult.message || "Recharge failed. Your GP balance has been fully refunded.",
        transaction: transactionRecord,
        refunded: true,
        refundedGp: numGp
      });
    }
  } catch (err) {
    console.error("VTU Purchase Endpoint Exception:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing telecom recharge: " + (err?.message || "Unknown error")
    });
  }
});
vtuRouter.post("/requery", async (req, res) => {
  try {
    const { transactionId } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }
    const tx = inMemoryTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction record not found" });
    }
    if (tx.status === "SUCCESS" || tx.status === "REFUNDED") {
      return res.json({
        success: true,
        status: tx.status,
        message: `Transaction is already finalized with status: ${tx.status}`,
        transaction: tx
      });
    }
    const queryResult = await vtuProvider.requeryTransaction({
      providerTransactionId: tx.providerTransactionId,
      reference: tx.transactionId,
      environment: currentSettings.providerEnvironment
    });
    if (queryResult.status === "SUCCESS") {
      tx.status = "SUCCESS";
      tx.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      tx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, tx);
      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: "TRANSACTION_SUCCESS",
        details: { requeryMessage: queryResult.message },
        status: "SUCCESS"
      });
    } else if (queryResult.status === "FAILED") {
      tx.status = "FAILED";
      tx.refundStatus = "REFUNDED";
      tx.failureReason = queryResult.message;
      tx.refundTransactionId = `REF_${transactionId}`;
      tx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, tx);
      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: "GP_REFUNDED",
        details: { requeryFailedReason: queryResult.message, refundedGp: tx.gpAmount },
        status: "REFUNDED"
      });
    }
    return res.json({
      success: true,
      status: tx.status,
      message: queryResult.message,
      transaction: tx
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Requery failed: " + (err?.message || "Server error")
    });
  }
});
vtuRouter.get("/admin/overview", async (_req, res) => {
  try {
    const balanceInfo = await vtuProvider.getProviderBalance(currentSettings.providerEnvironment);
    const allTxs = Array.from(inMemoryTransactions.values());
    const successfulTxs = allTxs.filter((t) => t.status === "SUCCESS");
    const pendingTxs = allTxs.filter((t) => t.status === "PENDING");
    const failedTxs = allTxs.filter((t) => t.status === "FAILED" || t.status === "REFUNDED");
    const totalNgn = successfulTxs.reduce((acc, t) => acc + t.amountNGN, 0);
    const totalGp = successfulTxs.reduce((acc, t) => acc + t.gpAmount, 0);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayTxs = successfulTxs.filter((t) => typeof t.createdAt === "string" && t.createdAt.startsWith(todayStr));
    const todayNgn = todayTxs.reduce((acc, t) => acc + t.amountNGN, 0);
    const todayGp = todayTxs.reduce((acc, t) => acc + t.gpAmount, 0);
    return res.json({
      success: true,
      stats: {
        provider: "Pairgate VTU Gateway",
        environment: currentSettings.providerEnvironment,
        providerConnected: balanceInfo.success,
        providerBalanceNGN: balanceInfo.balanceNGN,
        totalTransactions: allTxs.length,
        successfulTransactions: successfulTxs.length,
        pendingTransactions: pendingTxs.length,
        failedTransactions: failedTxs.length,
        totalNgnProcessed: totalNgn,
        totalGpRedeemed: totalGp,
        todayTransactionsCount: todayTxs.length,
        todayNgnProcessed: todayNgn,
        todayGpRedeemed: todayGp
      },
      settings: currentSettings
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Failed to load admin overview" });
  }
});
vtuRouter.post("/admin/settings", (req, res) => {
  try {
    const newSettings = req.body || {};
    const prevRate = currentSettings.gpToNgnRate;
    const prevEnv = currentSettings.providerEnvironment;
    currentSettings = {
      ...currentSettings,
      ...newSettings,
      gpToNgnRate: Number(newSettings.gpToNgnRate) > 0 ? Number(newSettings.gpToNgnRate) : currentSettings.gpToNgnRate,
      minAirtimeNGN: Number(newSettings.minAirtimeNGN) || currentSettings.minAirtimeNGN,
      maxAirtimeNGN: Number(newSettings.maxAirtimeNGN) || currentSettings.maxAirtimeNGN,
      minDataNGN: Number(newSettings.minDataNGN) || currentSettings.minDataNGN,
      maxDataNGN: Number(newSettings.maxDataNGN) || currentSettings.maxDataNGN,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: req.body.adminName || "Super Admin"
    };
    logAudit({
      action: "ADMIN_SETTINGS_CHANGED",
      details: {
        changes: newSettings,
        rateChangedFrom: prevRate !== currentSettings.gpToNgnRate ? `${prevRate} -> ${currentSettings.gpToNgnRate}` : void 0,
        envChangedFrom: prevEnv !== currentSettings.providerEnvironment ? `${prevEnv} -> ${currentSettings.providerEnvironment}` : void 0
      },
      status: "UPDATED"
    });
    return res.json({
      success: true,
      message: "Airtime & Mobile Data settings updated successfully",
      settings: currentSettings
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Failed to update settings" });
  }
});
vtuRouter.get("/admin/transactions", (req, res) => {
  try {
    const { search = "", status = "ALL", network = "ALL", serviceType = "ALL", page = "1", limit = "50" } = req.query;
    let txs = Array.from(inMemoryTransactions.values());
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      txs = txs.filter(
        (t) => t.transactionId.toLowerCase().includes(q) || t.providerTransactionId && t.providerTransactionId.toLowerCase().includes(q) || t.phoneNumber.includes(q) || t.userName.toLowerCase().includes(q) || t.userId.toLowerCase().includes(q) || t.userEmail && t.userEmail.toLowerCase().includes(q)
      );
    }
    if (status !== "ALL") {
      txs = txs.filter((t) => t.status === status);
    }
    if (network !== "ALL") {
      txs = txs.filter((t) => t.network === network);
    }
    if (serviceType !== "ALL") {
      txs = txs.filter((t) => t.serviceType === serviceType);
    }
    txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const totalCount = txs.length;
    const paginated = txs.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return res.json({
      success: true,
      transactions: paginated,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Failed to list transactions" });
  }
});
vtuRouter.get("/admin/audit-logs", (_req, res) => {
  return res.json({
    success: true,
    logs: inMemoryAuditLogs
  });
});
vtuRouter.post("/admin/reconcile", async (req, res) => {
  try {
    const { transactionId, manualStatus, adminNotes } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }
    const tx = inMemoryTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    const oldStatus = tx.status;
    if (manualStatus && ["SUCCESS", "FAILED", "PENDING", "REFUNDED"].includes(manualStatus)) {
      tx.status = manualStatus;
      if (manualStatus === "REFUNDED") {
        tx.refundStatus = "REFUNDED";
        tx.refundTransactionId = `MANUAL_REF_${transactionId}`;
      }
      tx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, tx);
      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: "TRANSACTION_RECONCILED",
        details: {
          oldStatus,
          newStatus: manualStatus,
          adminNotes: adminNotes || "Manual status override by administrator"
        },
        status: manualStatus
      });
      return res.json({
        success: true,
        message: `Transaction ${transactionId} status updated to ${manualStatus}`,
        transaction: tx
      });
    }
    const queryResult = await vtuProvider.requeryTransaction({
      providerTransactionId: tx.providerTransactionId,
      reference: tx.transactionId,
      environment: currentSettings.providerEnvironment
    });
    if (queryResult.status !== oldStatus) {
      tx.status = queryResult.status;
      tx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      inMemoryTransactions.set(transactionId, tx);
      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: "TRANSACTION_RECONCILED",
        details: {
          oldStatus,
          newStatus: queryResult.status,
          providerResponse: queryResult.rawResponse
        },
        status: queryResult.status
      });
    }
    return res.json({
      success: true,
      message: `Reconciled: ${queryResult.message}`,
      transaction: tx
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Reconciliation failed" });
  }
});

// server/minimartRouter.ts
import { Router as Router2 } from "express";

// src/data/mockMinimartData.ts
var DEFAULT_MINIMART_CONFIG = {
  premiumDailyListingLimit: 3,
  vipDailyListingLimit: 6,
  premiumListingDurationHours: 12,
  vipListingDurationHours: 12,
  enabled: true,
  minPriceNGN: 100,
  maxPriceNGN: 5e6,
  maxImagesPerListing: 4,
  limitsByTier: {
    free: { dailyListings: 0, listingDurationHours: 0 },
    premium: { dailyListings: 3, listingDurationHours: 12 },
    vip: { dailyListings: 6, listingDurationHours: 12 }
  }
};
var INITIAL_MINIMART_CATEGORIES = [
  {
    id: "cat_all",
    categoryId: "all",
    name: "All",
    description: "All student products and services",
    status: "active",
    displayOrder: 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_fashion",
    categoryId: "fashion",
    name: "Fashion",
    description: "Clothes, shoes, bags, hoodies, thrift & wear",
    status: "active",
    displayOrder: 2,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_electronics",
    categoryId: "electronics",
    name: "Electronics",
    description: "Chargers, power banks, audio, smart devices",
    status: "active",
    displayOrder: 3,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_phones",
    categoryId: "phones",
    name: "Phones",
    description: "Smartphones, cases, screen guards, mobile gear",
    status: "active",
    displayOrder: 4,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_computers",
    categoryId: "computers",
    name: "Computers",
    description: "Laptops, mouse, keyboards, flash drives, parts",
    status: "active",
    displayOrder: 5,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_books",
    categoryId: "books",
    name: "Books",
    description: "Course textbooks, past questions, revision guides",
    status: "active",
    displayOrder: 6,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_food",
    categoryId: "food",
    name: "Food",
    description: "Campus snacks, meal packs, pastries, beverages",
    status: "active",
    displayOrder: 7,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_beauty",
    categoryId: "beauty",
    name: "Beauty",
    description: "Skincare, perfumes, hair care, cosmetics",
    status: "active",
    displayOrder: 8,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_accessories",
    categoryId: "accessories",
    name: "Accessories",
    description: "Watches, jewelry, sunglasses, backpacks, belts",
    status: "active",
    displayOrder: 9,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_school_items",
    categoryId: "school_items",
    name: "School Items",
    description: "Calculators, lab coats, drawing boards, stationery",
    status: "active",
    displayOrder: 10,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_services",
    categoryId: "services",
    name: "Services",
    description: "Graphic design, photography, tutoring, printing, repairs",
    status: "active",
    displayOrder: 11,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cat_other",
    categoryId: "other",
    name: "Other",
    description: "General student items and misc products",
    status: "active",
    displayOrder: 12,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var now = Date.now();
var hourMs = 3600 * 1e3;
var INITIAL_MINIMART_PRODUCTS = [
  {
    id: "prod_1",
    productId: "prod_1",
    sellerId: "usr_unilag_101",
    sellerName: "Chinedu Okafor",
    sellerProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_unilag",
    institutionName: "University of Lagos",
    departmentName: "Electrical Engineering",
    productName: "Casio FX-991EX ClassWiz Scientific Calculator",
    categoryId: "school_items",
    categoryName: "School Items",
    description: "Original solar-powered Casio scientific calculator. Perfect for Engineering, Physics, and Mathematics exams. Clean display, no dead pixels, comes with protective slide-on hard case.",
    price: 16500,
    currency: "NGN",
    condition: "Fairly Used",
    imageUrls: [
      "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348012345678",
    location: "Faculty of Engineering / New Hall Hostel",
    additionalInfo: "Available for immediate pickup near Engineering Car Park.",
    status: "active",
    createdAt: new Date(now - 2 * hourMs).toISOString(),
    updatedAt: new Date(now - 2 * hourMs).toISOString(),
    expiresAt: new Date(now + 10 * hourMs).toISOString(),
    subscriptionPlan: "premium",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 42
  },
  {
    id: "prod_2",
    productId: "prod_2",
    sellerId: "usr_ui_202",
    sellerName: "Amina Yusuf",
    sellerProfileImage: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_ui",
    institutionName: "University of Ibadan",
    departmentName: "Economics",
    productName: "Nike Air Force 1 Low Triple White (Size 42)",
    categoryId: "fashion",
    categoryName: "Fashion",
    description: "Brand new Nike Air Force 1 sneakers. Size 42 (EU). High quality, clean stitch, original box included. Never worn.",
    price: 28e3,
    currency: "NGN",
    condition: "New",
    imageUrls: [
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348023456789",
    location: "Queen Idia Hall / Mellanby Block",
    additionalInfo: "Can bring to SUB or Faculty of Social Sciences.",
    status: "active",
    createdAt: new Date(now - 3 * hourMs).toISOString(),
    updatedAt: new Date(now - 3 * hourMs).toISOString(),
    expiresAt: new Date(now + 9 * hourMs).toISOString(),
    subscriptionPlan: "vip",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 88
  },
  {
    id: "prod_3",
    productId: "prod_3",
    sellerId: "usr_covenant_303",
    sellerName: "Tunde Bakare",
    sellerProfileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_covenant",
    institutionName: "Covenant University",
    departmentName: "Computer Science",
    productName: "Apple MacBook Air M1 (8GB RAM / 256GB SSD) Space Gray",
    categoryId: "computers",
    categoryName: "Computers",
    description: "Pristine condition MacBook Air M1. 92% battery health, cycle count 180. Comes with original 30W USB-C power adapter and type-C cable. Perfect for coding, design, and school assignments.",
    price: 52e4,
    currency: "NGN",
    condition: "Fairly Used",
    imageUrls: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348034567890",
    location: "Peter Hall / Cafeteria 2",
    additionalInfo: "Inspection available on campus. Serious buyers only.",
    status: "active",
    createdAt: new Date(now - 1 * hourMs).toISOString(),
    updatedAt: new Date(now - 1 * hourMs).toISOString(),
    expiresAt: new Date(now + 11 * hourMs).toISOString(),
    subscriptionPlan: "vip",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 135
  },
  {
    id: "prod_4",
    productId: "prod_4",
    sellerId: "usr_oau_404",
    sellerName: "Blessing Adeyemi",
    sellerProfileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_oau",
    institutionName: "Obafemi Awolowo University",
    departmentName: "Chemical Engineering",
    productName: "Heavy Duty Laboratory Coat + Safety Goggles Set (Size L)",
    categoryId: "school_items",
    categoryName: "School Items",
    description: "100% thick white cotton lab coat with press studs and deep front pockets. Includes anti-fog safety splash goggles. Required for all 100L - 300L Science & Engineering labs.",
    price: 9e3,
    currency: "NGN",
    condition: "New",
    imageUrls: [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348045678901",
    location: "SUB Building / Moz / Angola Hall",
    additionalInfo: "Ready for pickup before lab practicals.",
    status: "active",
    createdAt: new Date(now - 4 * hourMs).toISOString(),
    updatedAt: new Date(now - 4 * hourMs).toISOString(),
    expiresAt: new Date(now + 8 * hourMs).toISOString(),
    subscriptionPlan: "premium",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 61
  },
  {
    id: "prod_5",
    productId: "prod_5",
    sellerId: "usr_unn_505",
    sellerName: "Emeka Nwosu",
    sellerProfileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_unn",
    institutionName: "University of Nigeria, Nsukka",
    departmentName: "Microbiology",
    productName: "Anker PowerCore 20,000mAh 22.5W Fast Charging Power Bank",
    categoryId: "electronics",
    categoryName: "Electronics",
    description: "Dual USB-A and USB-C Power Delivery ports. Charges iPhone/Samsung 4-5 times over. Great for night prep when hostel power goes out.",
    price: 24500,
    currency: "NGN",
    condition: "Used",
    imageUrls: [
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348056789012",
    location: "Franco Hostel / GS Building",
    additionalInfo: "Comes with braided Type-C cable.",
    status: "active",
    createdAt: new Date(now - 5 * hourMs).toISOString(),
    updatedAt: new Date(now - 5 * hourMs).toISOString(),
    expiresAt: new Date(now + 7 * hourMs).toISOString(),
    subscriptionPlan: "premium",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 79
  },
  {
    id: "prod_6",
    productId: "prod_6",
    sellerId: "usr_abu_606",
    sellerName: "Fatima Bello",
    sellerProfileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_abu",
    institutionName: "Ahmadu Bello University",
    departmentName: "Mass Communication",
    productName: "Samsung Galaxy S22 5G (128GB / 8GB RAM) Phantom Black",
    categoryId: "phones",
    categoryName: "Phones",
    description: "Clean Samsung Galaxy S22 5G in excellent condition. Flawless 120Hz Dynamic AMOLED display, crisp triple cameras, snapdragon processor. Factory unlocked.",
    price: 295e3,
    currency: "NGN",
    condition: "Used",
    imageUrls: [
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348067890123",
    location: "Samaru Campus / Ribadu Hall",
    additionalInfo: "Swap with iPhone 13 also considered.",
    status: "active",
    createdAt: new Date(now - 6 * hourMs).toISOString(),
    updatedAt: new Date(now - 6 * hourMs).toISOString(),
    expiresAt: new Date(now + 6 * hourMs).toISOString(),
    subscriptionPlan: "vip",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 110
  },
  {
    id: "prod_7",
    productId: "prod_7",
    sellerId: "usr_futa_707",
    sellerName: "Oluwaseun Adeleke",
    sellerProfileImage: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_futa",
    institutionName: "Federal University of Technology, Akure",
    departmentName: "Civil Engineering",
    productName: "Advanced Engineering Mathematics by Erwin Kreyszig (10th Ed)",
    categoryId: "books",
    categoryName: "Books",
    description: "Complete 10th edition hardcover textbook with all solved tutorial exercises, differential equations, and linear algebra chapters. Extremely clean pages.",
    price: 7500,
    currency: "NGN",
    condition: "Fairly Used",
    imageUrls: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348078901234",
    location: "FUTA South Gate / SEET Complex",
    additionalInfo: "Includes bonus past questions printout.",
    status: "active",
    createdAt: new Date(now - 7 * hourMs).toISOString(),
    updatedAt: new Date(now - 7 * hourMs).toISOString(),
    expiresAt: new Date(now + 5 * hourMs).toISOString(),
    subscriptionPlan: "premium",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 54
  },
  {
    id: "prod_8",
    productId: "prod_8",
    sellerId: "usr_unilorin_808",
    sellerName: "Zainab Mohammed",
    sellerProfileImage: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    institutionId: "inst_unilorin",
    institutionName: "University of Ilorin",
    departmentName: "Biochemistry",
    productName: "Professional Graphic Design & Flyer Package for Campus Events",
    categoryId: "services",
    categoryName: "Services",
    description: "High-converting graphics, departmental banners, SUG election posters, concert fliers, and logo design. Same-day turnaround and high-resolution print-ready files.",
    price: 5e3,
    currency: "NGN",
    condition: "New",
    imageUrls: [
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80"
    ],
    whatsappNumber: "+2348089012345",
    location: "PS Walkway / Faculty of Life Sciences",
    additionalInfo: "Check out my portfolio on WhatsApp.",
    status: "active",
    createdAt: new Date(now - 8 * hourMs).toISOString(),
    updatedAt: new Date(now - 8 * hourMs).toISOString(),
    expiresAt: new Date(now + 4 * hourMs).toISOString(),
    subscriptionPlan: "premium",
    listingDurationHours: 12,
    reportsCount: 0,
    viewsCount: 95
  }
];

// server/minimartRouter.ts
var minimartRouter = Router2();
var currentConfig = { ...DEFAULT_MINIMART_CONFIG };
var categories = [...INITIAL_MINIMART_CATEGORIES];
var products = [...INITIAL_MINIMART_PRODUCTS];
var reports = [];
function getUserTier(user) {
  if (!user) return "free";
  if (user.role === "admin" || user.role === "super_admin" || user.isAdmin || user.isSuperAdmin) return "vip";
  if (user.role === "community_manager") return "vip";
  if (user.subscriptionExpiry) {
    try {
      const expTime = new Date(user.subscriptionExpiry).getTime();
      if (!isNaN(expTime) && expTime <= Date.now() && !user.isSuperAdmin && user.role !== "admin") {
        return "free";
      }
    } catch {
    }
  }
  const membership = (user.membershipTier || "").toLowerCase().trim();
  const subTier = (user.subscriptionTier || "").toLowerCase().trim();
  const plan = (user.subscriptionPlan || user.planId || user.subscriptionTier || user.membershipTier || user.tier || user.activePlanId || "").toLowerCase().trim();
  const planName = (user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || "").toLowerCase().trim();
  const isExplicitlyFree = membership === "free" || membership === "free scholar" || membership === "scholar (starter)" || membership === "starter scholar" || subTier === "free" || subTier === "free scholar" || plan === "free" || plan === "plan_free" || plan === "free_starter";
  if (user.isVip || membership.includes("vip") || membership.includes("titan") || subTier.includes("vip") || subTier.includes("titan") || plan.includes("vip") || plan.includes("titan") || planName.includes("vip") || planName.includes("titan") || plan.includes("annual") || planName.includes("annual")) {
    return "vip";
  }
  if (isExplicitlyFree && !user.isPremium) {
    return "free";
  }
  const isPremiumCandidate = Boolean(
    user.isPremium || user.isSubscribed && !isExplicitlyFree || membership.includes("premium") || membership.includes("pro") || membership.includes("champion") || subTier.includes("premium") || subTier.includes("pro") || subTier.includes("champion") || plan.includes("premium") || plan.includes("pro") || plan.includes("basic_naira") || planName.includes("premium") || planName.includes("pro") || planName.includes("basic monthly")
  );
  if (isPremiumCandidate) {
    if (!membership.includes("free") && !subTier.includes("free") && !plan.includes("free")) {
      return "premium";
    }
  }
  return "free";
}
function calculateUserListingEligibility(userId, userTier) {
  if (userTier === "free") {
    return {
      userId,
      todayCount: 0,
      dailyLimit: 0,
      remainingToday: 0,
      userTier: "free",
      canCreateProduct: false,
      listingDurationHours: 0,
      reason: "Selling on Grobax Minimart is exclusive to Premium and VIP scholars."
    };
  }
  const dailyLimit = userTier === "vip" ? currentConfig.vipDailyListingLimit : currentConfig.premiumDailyListingLimit;
  const durationHours = userTier === "vip" ? currentConfig.vipListingDurationHours : currentConfig.premiumListingDurationHours;
  const now2 = Date.now();
  const oneDayAgo = now2 - 24 * 60 * 60 * 1e3;
  const todayListings = products.filter((p) => {
    if (p.sellerId !== userId) return false;
    if (p.status === "removed" || p.status === "archived") return false;
    const createdTime = new Date(p.createdAt).getTime();
    return createdTime >= oneDayAgo;
  });
  const count = todayListings.length;
  const remaining = Math.max(0, dailyLimit - count);
  const canCreate = remaining > 0 && currentConfig.enabled;
  let reason = "";
  if (!currentConfig.enabled) {
    reason = "Minimart listing is temporarily paused by platform administrators.";
  } else if (remaining <= 0) {
    reason = `Daily limit reached (${count}/${dailyLimit}). You can create another listing tomorrow.`;
  }
  return {
    userId,
    todayCount: count,
    dailyLimit,
    remainingToday: remaining,
    userTier,
    canCreateProduct: canCreate,
    listingDurationHours: durationHours,
    reason
  };
}
function markExpiredListings() {
  const now2 = Date.now();
  products = products.map((p) => {
    if (p.status === "active") {
      const exp = new Date(p.expiresAt).getTime();
      if (now2 >= exp) {
        return { ...p, status: "expired" };
      }
    }
    return p;
  });
}
minimartRouter.get("/config", (_req, res) => {
  res.json({
    success: true,
    config: currentConfig
  });
});
minimartRouter.post("/config", (req, res) => {
  const updates = req.body || {};
  currentConfig = {
    ...currentConfig,
    ...updates,
    premiumDailyListingLimit: Number(updates.premiumDailyListingLimit ?? currentConfig.premiumDailyListingLimit),
    vipDailyListingLimit: Number(updates.vipDailyListingLimit ?? currentConfig.vipDailyListingLimit),
    premiumListingDurationHours: Number(updates.premiumListingDurationHours ?? currentConfig.premiumListingDurationHours),
    vipListingDurationHours: Number(updates.vipListingDurationHours ?? currentConfig.vipListingDurationHours),
    enabled: updates.enabled !== void 0 ? Boolean(updates.enabled) : currentConfig.enabled
  };
  res.json({
    success: true,
    message: "Minimart configuration updated successfully.",
    config: currentConfig
  });
});
minimartRouter.get("/categories", (_req, res) => {
  res.json({
    success: true,
    categories
  });
});
minimartRouter.post("/categories", (req, res) => {
  const { id, categoryId, name, description, icon, status, displayOrder } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: "Category name is required." });
  }
  const existingIndex = categories.findIndex((c) => c.id === id || c.categoryId === categoryId);
  if (existingIndex >= 0) {
    categories[existingIndex] = {
      ...categories[existingIndex],
      name: name.trim(),
      description: description || categories[existingIndex].description,
      icon: icon || categories[existingIndex].icon,
      status: status || categories[existingIndex].status,
      displayOrder: displayOrder ?? categories[existingIndex].displayOrder,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return res.json({ success: true, category: categories[existingIndex] });
  }
  const newCatId = categoryId || `cat_${Date.now()}`;
  const newCat = {
    id: id || newCatId,
    categoryId: newCatId,
    name: name.trim(),
    description: description || "",
    icon: icon || "",
    status: status || "active",
    displayOrder: displayOrder ?? categories.length + 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  categories.push(newCat);
  res.json({ success: true, category: newCat });
});
minimartRouter.delete("/categories/:id", (req, res) => {
  const { id } = req.params;
  categories = categories.filter((c) => c.id !== id && c.categoryId !== id);
  res.json({ success: true, message: "Category removed." });
});
minimartRouter.get("/eligibility", (req, res) => {
  const userId = req.query.userId || "";
  const role = req.query.role || "";
  const plan = req.query.plan || "";
  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId parameter." });
  }
  const tier = getUserTier({ role, subscriptionPlan: plan, isPremium: req.query.isPremium === "true", isVip: req.query.isVip === "true" });
  const eligibility = calculateUserListingEligibility(userId, tier);
  res.json({
    success: true,
    eligibility
  });
});
minimartRouter.get("/products", (req, res) => {
  markExpiredListings();
  const { category, condition, sellerId, search, status = "active", includeExpired = "false" } = req.query;
  let results = [...products];
  if (includeExpired === "true") {
    results = results.filter((p) => p.status !== "removed" && p.status !== "archived");
  } else if (status) {
    results = results.filter((p) => p.status === status);
  }
  if (sellerId) {
    results = results.filter((p) => p.sellerId === sellerId);
  }
  if (category && category !== "all") {
    results = results.filter((p) => p.categoryId === category || p.categoryName.toLowerCase() === category.toLowerCase());
  }
  if (condition && condition !== "all") {
    results = results.filter((p) => p.condition.toLowerCase() === condition.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase().trim();
    results = results.filter(
      (p) => p.productName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.sellerName.toLowerCase().includes(q) || p.institutionName.toLowerCase().includes(q) || p.location && p.location.toLowerCase().includes(q)
    );
  }
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({
    success: true,
    total: results.length,
    products: results
  });
});
minimartRouter.post("/products", (req, res) => {
  if (!currentConfig.enabled) {
    return res.status(403).json({ success: false, error: "Minimart is currently disabled by administrators." });
  }
  const {
    sellerId,
    sellerName,
    sellerProfileImage,
    institutionId,
    institutionName,
    departmentName,
    productName,
    categoryId,
    categoryName,
    description,
    price,
    condition,
    imageUrls,
    whatsappNumber,
    location,
    additionalInfo,
    userRole,
    subscriptionPlan
  } = req.body || {};
  if (!sellerId || !sellerName) {
    return res.status(400).json({ success: false, error: "Authenticated seller credentials are required." });
  }
  if (!productName || !productName.trim()) {
    return res.status(400).json({ success: false, error: "Product name is required." });
  }
  if (!price || isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ success: false, error: "A valid price in Naira is required." });
  }
  if (!whatsappNumber || !whatsappNumber.trim()) {
    return res.status(400).json({ success: false, error: "A valid WhatsApp phone number is required." });
  }
  let sanitizedWhatsapp = whatsappNumber.replace(/[^\d+]/g, "");
  if (sanitizedWhatsapp.startsWith("0")) {
    sanitizedWhatsapp = "234" + sanitizedWhatsapp.slice(1);
  }
  if (!sanitizedWhatsapp.startsWith("+") && !sanitizedWhatsapp.startsWith("234")) {
    sanitizedWhatsapp = "234" + sanitizedWhatsapp;
  }
  if (!sanitizedWhatsapp.startsWith("+")) {
    sanitizedWhatsapp = "+" + sanitizedWhatsapp;
  }
  if (sanitizedWhatsapp.length < 11) {
    return res.status(400).json({ success: false, error: "Invalid WhatsApp phone number format. Please provide a valid Nigerian line." });
  }
  const tier = getUserTier({ role: userRole, subscriptionPlan });
  const eligibility = calculateUserListingEligibility(sellerId, tier);
  if (!eligibility.canCreateProduct) {
    return res.status(403).json({
      success: false,
      error: eligibility.reason || "Subscription restriction: Upgrade plan to publish product listings.",
      eligibility
    });
  }
  const now2 = Date.now();
  const durationHours = eligibility.listingDurationHours || 12;
  const expiresAt = new Date(now2 + durationHours * 60 * 60 * 1e3).toISOString();
  const newProduct = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productId: `prod_${Date.now()}`,
    sellerId,
    sellerName,
    sellerProfileImage: sellerProfileImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    institutionId: institutionId || "inst_unilag",
    institutionName: institutionName || "Verified Scholar Institution",
    departmentName: departmentName || "Department",
    productName: productName.trim(),
    categoryId: categoryId || "other",
    categoryName: categoryName || "Other",
    description: description ? description.trim() : "",
    price: Number(price),
    currency: "NGN",
    condition: condition || "New",
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"],
    whatsappNumber: sanitizedWhatsapp,
    location: location ? location.trim() : void 0,
    additionalInfo: additionalInfo ? additionalInfo.trim() : void 0,
    status: "active",
    createdAt: new Date(now2).toISOString(),
    updatedAt: new Date(now2).toISOString(),
    expiresAt,
    subscriptionPlan: tier,
    listingDurationHours: durationHours,
    reportsCount: 0,
    viewsCount: 0
  };
  products.unshift(newProduct);
  res.status(201).json({
    success: true,
    message: "Product listed successfully on Minimart!",
    product: newProduct
  });
});
minimartRouter.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const {
    userId,
    userRole,
    productName,
    categoryId,
    categoryName,
    description,
    price,
    condition,
    imageUrls,
    whatsappNumber,
    location,
    additionalInfo,
    status
  } = req.body || {};
  const productIndex = products.findIndex((p) => p.id === id || p.productId === id);
  if (productIndex < 0) {
    return res.status(404).json({ success: false, error: "Product not found." });
  }
  const existing = products[productIndex];
  const isOwner = existing.sellerId === userId;
  const isAdmin = userRole === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, error: "Unauthorized to modify this listing." });
  }
  let sanitizedWhatsapp = existing.whatsappNumber;
  if (whatsappNumber) {
    let w = whatsappNumber.replace(/[^\d+]/g, "");
    if (w.startsWith("0")) w = "234" + w.slice(1);
    if (!w.startsWith("+") && !w.startsWith("234")) w = "234" + w;
    if (!w.startsWith("+")) w = "+" + w;
    sanitizedWhatsapp = w;
  }
  const updated = {
    ...existing,
    productName: productName ? productName.trim() : existing.productName,
    categoryId: categoryId || existing.categoryId,
    categoryName: categoryName || existing.categoryName,
    description: description !== void 0 ? description.trim() : existing.description,
    price: price !== void 0 && !isNaN(Number(price)) ? Number(price) : existing.price,
    condition: condition || existing.condition,
    imageUrls: Array.isArray(imageUrls) ? imageUrls : existing.imageUrls,
    whatsappNumber: sanitizedWhatsapp,
    location: location !== void 0 ? location.trim() : existing.location,
    additionalInfo: additionalInfo !== void 0 ? additionalInfo.trim() : existing.additionalInfo,
    status: status || existing.status,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  products[productIndex] = updated;
  res.json({
    success: true,
    message: "Product listing updated.",
    product: updated
  });
});
minimartRouter.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId;
  const userRole = req.query.userRole;
  const productIndex = products.findIndex((p) => p.id === id || p.productId === id);
  if (productIndex < 0) {
    return res.status(404).json({ success: false, error: "Product not found." });
  }
  const existing = products[productIndex];
  const isOwner = existing.sellerId === userId;
  const isAdmin = userRole === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, error: "Unauthorized to delete this listing." });
  }
  products = products.filter((p) => p.id !== id && p.productId !== id);
  reports = reports.filter((r) => r.productId !== id);
  res.json({
    success: true,
    message: "Product removed from Minimart."
  });
});
minimartRouter.post("/products/:id/report", (req, res) => {
  const { id } = req.params;
  const { reportedBy, reporterName, reason, description } = req.body || {};
  if (!reportedBy) {
    return res.status(400).json({ success: false, error: "Reporter ID is required." });
  }
  if (!reason) {
    return res.status(400).json({ success: false, error: "Please select a reason for the report." });
  }
  const product = products.find((p) => p.id === id || p.productId === id);
  if (!product) {
    return res.status(404).json({ success: false, error: "Product not found." });
  }
  const report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reportId: `rep_${Date.now()}`,
    productId: product.id,
    productName: product.productName,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    reportedBy,
    reporterName: reporterName || "Scholar Reporter",
    reason,
    description: description ? description.trim() : "",
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  reports.unshift(report);
  product.reportsCount = (product.reportsCount || 0) + 1;
  res.status(201).json({
    success: true,
    message: "Thank you for helping keep the campus community safe. Your report has been submitted to moderators.",
    report
  });
});
minimartRouter.get("/admin/reports", (_req, res) => {
  res.json({
    success: true,
    reports
  });
});
minimartRouter.post("/admin/reports/:id/moderate", (req, res) => {
  const { id } = req.params;
  const { action, adminNotes, adminId } = req.body || {};
  const repIndex = reports.findIndex((r) => r.id === id || r.reportId === id);
  if (repIndex < 0) {
    return res.status(404).json({ success: false, error: "Report not found." });
  }
  const report = reports[repIndex];
  report.status = action === "dismiss" ? "dismissed" : "resolved";
  report.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  report.reviewedBy = adminId || "Admin";
  report.adminNotes = adminNotes || "";
  if (action === "suspend_product") {
    const prod = products.find((p) => p.id === report.productId);
    if (prod) {
      prod.status = "suspended";
      prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
  }
  res.json({
    success: true,
    message: `Report ${action === "dismiss" ? "dismissed" : "resolved"}.`,
    report
  });
});
minimartRouter.post("/admin/moderate-product", (req, res) => {
  const { productId, status } = req.body || {};
  const prod = products.find((p) => p.id === productId || p.productId === productId);
  if (!prod) {
    return res.status(404).json({ success: false, error: "Product not found." });
  }
  prod.status = status;
  prod.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  res.json({
    success: true,
    message: `Product status updated to ${status}.`,
    product: prod
  });
});

// server/paystackRouter.ts
import express from "express";
import crypto from "crypto";
var paystackRouter = express.Router();
function getSecretKey() {
  const envKey = process.env.PAYSTACK_SECRET_KEY;
  if (envKey && envKey !== "sk_live_5cbc6fe7efd4cbbda704ad5450f38b31a81ae80d" && envKey.startsWith("sk_")) {
    return envKey;
  }
  return "sk_live_f36e65abf11267b133af3a3d20901e0931c49c02";
}
function getPublicKey() {
  const envPub = process.env.PAYSTACK_PUBLIC_KEY;
  if (envPub && envPub !== "pk_live_deaacb75c134e2c4a921c2674e65d4319d4b1fa4" && envPub.startsWith("pk_")) {
    return envPub;
  }
  return "pk_live_70e9ddbaca92590a8bfbd673b80abb40f083ac96";
}
paystackRouter.get("/public-key", (_req, res) => {
  const publicKey = getPublicKey();
  res.json({
    success: true,
    publicKey,
    hasSecretKey: Boolean(getSecretKey() && getSecretKey().startsWith("sk_"))
  });
});
paystackRouter.post("/initialize", async (req, res) => {
  try {
    const {
      planId,
      planName,
      amountNaira,
      email,
      userId,
      userName,
      callbackUrl
    } = req.body || {};
    if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
      return res.status(400).json({
        success: false,
        error: "A valid amount in Naira is required."
      });
    }
    const cleanEmail = email && email.includes("@") ? email : "scholar@grobax.org";
    const amountInKobo = Math.round(Number(amountNaira) * 100);
    const reference = `GRBX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const secretKey = getSecretKey();
    const publicKey = getPublicKey();
    if (secretKey && (secretKey.startsWith("sk_live_") || secretKey.startsWith("sk_test_"))) {
      try {
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: cleanEmail,
            amount: amountInKobo,
            reference,
            currency: "NGN",
            callback_url: callbackUrl || void 0,
            channels: ["card", "bank", "bank_transfer", "ussd", "qr", "mobile_money"],
            metadata: {
              userId,
              userName,
              planId,
              planName,
              amountNaira: Number(amountNaira),
              platform: "grobax_web",
              custom_fields: [
                {
                  display_name: "Plan Name",
                  variable_name: "plan_name",
                  value: planName || "Grobax Membership"
                },
                {
                  display_name: "Scholar UID",
                  variable_name: "scholar_uid",
                  value: userId || "unknown"
                }
              ]
            }
          })
        });
        const data = await response.json();
        if (data && data.status && data.data) {
          return res.json({
            success: true,
            isLive: secretKey.startsWith("sk_live_"),
            reference,
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            publicKey,
            amountNaira: Number(amountNaira),
            currency: "NGN"
          });
        } else {
          console.warn("[Paystack Initialize] API error:", data);
          return res.status(400).json({
            success: false,
            error: data.message || "Failed to initialize Paystack transaction."
          });
        }
      } catch (apiErr) {
        console.error("[Paystack Initialize] Network error:", apiErr);
        return res.status(502).json({
          success: false,
          error: "Could not connect to Paystack payment gateway. Please check your network and credentials."
        });
      }
    }
    return res.json({
      success: true,
      isSimulated: true,
      reference,
      publicKey,
      amountNaira: Number(amountNaira),
      currency: "NGN",
      message: "Paystack Secret Key (PAYSTACK_SECRET_KEY) not detected in environment. Running in secure verification fallback mode."
    });
  } catch (err) {
    console.error("[Paystack Initialize] Internal error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error initializing payment."
    });
  }
});
paystackRouter.post("/charge-transfer", async (req, res) => {
  try {
    const {
      planId,
      planName,
      amountNaira,
      email,
      userId,
      userName
    } = req.body || {};
    if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
      return res.status(400).json({
        success: false,
        error: "A valid amount in Naira is required."
      });
    }
    const cleanEmail = email && email.includes("@") ? email.trim().toLowerCase() : "scholar@grobax.org";
    const amountInKobo = Math.round(Number(amountNaira) * 100);
    const reference = `GRBX_TRF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const secretKey = getSecretKey();
    if (!secretKey || !secretKey.startsWith("sk_live_") && !secretKey.startsWith("sk_test_")) {
      return res.status(400).json({
        success: false,
        error: "Paystack live secret key is not configured in server environment."
      });
    }
    try {
      const chargeResponse = await fetch("https://api.paystack.co/charge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: cleanEmail,
          amount: amountInKobo,
          reference,
          currency: "NGN",
          bank_transfer: {
            account_expires_at: null
          },
          metadata: {
            userId,
            userName,
            planId,
            planName,
            amountNaira: Number(amountNaira),
            platform: "grobax_web"
          }
        })
      });
      const chargeData = await chargeResponse.json();
      if (chargeData && chargeData.status && chargeData.data) {
        const d = chargeData.data;
        const bankName = d.bank?.name || (d.bank?.slug === "titan-paystack" ? "Titan Trust Bank" : "Paystack-Titan");
        const accountNumber = d.account_number;
        if (accountNumber) {
          return res.json({
            success: true,
            reference: d.reference || reference,
            accountNumber,
            accountName: d.account_name || "PAYSTACK CHECKOUT",
            bankName,
            bankSlug: d.bank?.slug || "titan-paystack",
            amountNaira: d.amount ? d.amount / 100 : Number(amountNaira),
            expiresAt: d.account_expires_at,
            displayText: d.display_text || "Please make a transfer to the account specified",
            status: d.status
          });
        }
      }
      console.warn("[Paystack Charge Transfer] Direct charge response without account:", chargeData);
    } catch (chargeErr) {
      console.warn("[Paystack Charge Transfer] Direct charge error:", chargeErr);
    }
    const initResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: cleanEmail,
        amount: amountInKobo,
        reference,
        currency: "NGN",
        channels: ["bank_transfer", "card", "bank", "ussd"],
        metadata: {
          userId,
          userName,
          planId,
          planName,
          amountNaira: Number(amountNaira),
          platform: "grobax_web"
        }
      })
    });
    const initData = await initResponse.json();
    if (initData && initData.status && initData.data) {
      return res.json({
        success: true,
        reference,
        authorization_url: initData.data.authorization_url,
        access_code: initData.data.access_code,
        amountNaira: Number(amountNaira),
        fallbackCheckout: true
      });
    }
    return res.status(400).json({
      success: false,
      error: initData.message || "Could not generate transfer account from Paystack."
    });
  } catch (err) {
    console.error("[Paystack Charge Transfer] Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error creating transfer account."
    });
  }
});
paystackRouter.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: "Payment reference parameter is required."
      });
    }
    const secretKey = getSecretKey();
    if (secretKey && (secretKey.startsWith("sk_live_") || secretKey.startsWith("sk_test_"))) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretKey}`
          }
        });
        const data = await response.json();
        if (data && data.status && data.data) {
          const tx = data.data;
          const isSuccessful = tx.status === "success";
          const isPending = tx.status === "ongoing" || tx.status === "pending_bank_transfer" || tx.status === "pending";
          return res.json({
            success: true,
            verified: isSuccessful,
            status: tx.status,
            amountNaira: tx.amount ? tx.amount / 100 : 0,
            reference: tx.reference,
            channel: tx.channel,
            paidAt: tx.paid_at || (isSuccessful ? (/* @__PURE__ */ new Date()).toISOString() : null),
            metadata: tx.metadata || {},
            planId: tx.metadata?.planId,
            planName: tx.metadata?.planName,
            customer: tx.customer,
            gatewayResponse: tx.gateway_response,
            isPending
          });
        } else {
          return res.json({
            success: false,
            verified: false,
            status: "failed",
            error: data.message || "Transaction could not be verified by Paystack."
          });
        }
      } catch (err) {
        console.error("[Paystack Verify] Error:", err);
        return res.status(502).json({
          success: false,
          verified: false,
          error: "Failed to verify transaction with Paystack API."
        });
      }
    }
    return res.json({
      success: true,
      verified: true,
      status: "success",
      isSimulated: true,
      reference,
      paidAt: (/* @__PURE__ */ new Date()).toISOString(),
      amountNaira: 0,
      planId: reference.startsWith("plan_") ? reference : undefined
    });
  } catch (err) {
    console.error("[Paystack Verify] Internal error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error verifying transaction."
    });
  }
});
paystackRouter.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const secretKey = getSecretKey();
    if (!secretKey) {
      return res.status(200).send("No secret key configured");
    }
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      return res.status(400).send("No signature provided");
    }
    const bodyBuffer = req.body;
    const bodyStr = typeof bodyBuffer === "string" ? bodyBuffer : bodyBuffer.toString("utf8");
    const hash = crypto.createHmac("sha512", secretKey).update(bodyStr).digest("hex");
    if (hash !== signature) {
      console.warn("[Paystack Webhook] Invalid signature mismatch");
      return res.status(400).send("Invalid signature");
    }
    const event = JSON.parse(bodyStr);
    console.log(`[Paystack Webhook] Received verified event: ${event.event} | Ref: ${event.data?.reference}`);
    if (event.event === "charge.success") {
      const data = event.data;
      console.log(`[Paystack Webhook] Successful payment for ${data.customer?.email} - \u20A6${data.amount / 100}`);
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Paystack Webhook] Error:", err);
    return res.status(500).send("Webhook handler error");
  }
});

// server/libraryRouter.ts
import { Router as Router3 } from "express";
var libraryRouter = Router3();
var DEFAULT_SETTINGS = {
  enabled: true,
  uploadGpReward: 50,
  freeDailyViewLimit: 2,
  premiumDailyViewLimit: 10,
  vipDailyViewLimit: "unlimited",
  allowUserUploads: true,
  requireVerification: true,
  maxUploadsPerWeek: 1,
  maxUploadsPerDay: 1
};
var currentSettings2 = { ...DEFAULT_SETTINGS };
function getYearWeekKey(date = /* @__PURE__ */ new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function generatePastQuestionCompositeKey(institutionId, departmentName, level, courseCode, academicSession, semester) {
  const sanitize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${sanitize(institutionId)}_${sanitize(departmentName)}_${sanitize(level)}_${sanitize(courseCode)}_${sanitize(academicSession)}_${sanitize(semester)}`;
}
libraryRouter.get("/settings", (_req, res) => {
  res.json({
    success: true,
    settings: currentSettings2
  });
});
libraryRouter.post("/settings", (req, res) => {
  try {
    const { settings } = req.body || {};
    if (settings && typeof settings === "object") {
      const weeklyLimit = Math.max(1, Number(settings.maxUploadsPerWeek) || Number(settings.maxUploadsPerDay) || 1);
      currentSettings2 = {
        ...currentSettings2,
        ...settings,
        uploadGpReward: Math.max(0, Number(settings.uploadGpReward) || 50),
        freeDailyViewLimit: Math.max(1, Number(settings.freeDailyViewLimit) || 2),
        premiumDailyViewLimit: Math.max(1, Number(settings.premiumDailyViewLimit) || 10),
        vipDailyViewLimit: settings.vipDailyViewLimit === "unlimited" ? "unlimited" : Math.max(1, Number(settings.vipDailyViewLimit) || 20),
        maxUploadsPerWeek: weeklyLimit,
        maxUploadsPerDay: weeklyLimit
      };
      return res.json({
        success: true,
        settings: currentSettings2,
        message: "Past questions library settings updated successfully."
      });
    }
    return res.status(400).json({ success: false, error: "Invalid settings payload provided." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to update settings." });
  }
});
libraryRouter.post("/upload-check", (req, res) => {
  try {
    const { userId, weekUploadCount = 0, todayUploadCount = 0 } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required." });
    }
    const currentCount = Number(weekUploadCount !== void 0 ? weekUploadCount : todayUploadCount) || 0;
    const maxAllowed = currentSettings2.maxUploadsPerWeek || currentSettings2.maxUploadsPerDay || 1;
    const canUpload = currentCount < maxAllowed;
    return res.json({
      success: true,
      canUpload,
      maxUploadsPerWeek: maxAllowed,
      maxUploadsPerDay: maxAllowed,
      weekUploadCount: currentCount,
      todayUploadCount: currentCount,
      remainingUploads: Math.max(0, maxAllowed - currentCount),
      allowUserUploads: currentSettings2.allowUserUploads,
      currentWeek: getYearWeekKey()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Server check failed." });
  }
});
libraryRouter.post("/duplicate-check", (req, res) => {
  try {
    const {
      institutionId,
      departmentName,
      level,
      courseCode,
      academicSession,
      semester
    } = req.body || {};
    if (!institutionId || !departmentName || !level || !courseCode || !academicSession) {
      return res.status(400).json({ success: false, error: "Missing required academic metadata." });
    }
    const compositeKey = generatePastQuestionCompositeKey(
      institutionId,
      departmentName,
      level,
      courseCode,
      academicSession,
      semester || "1st Semester"
    );
    return res.json({
      success: true,
      compositeKey
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Duplicate check failed." });
  }
});
libraryRouter.post("/view-check", (req, res) => {
  try {
    const {
      userId,
      userTier = "free",
      // 'free' | 'premium' | 'vip'
      viewsToday = 0
    } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required to verify viewing permissions." });
    }
    let dailyLimit = currentSettings2.freeDailyViewLimit;
    if (userTier === "vip") {
      dailyLimit = currentSettings2.vipDailyViewLimit;
    } else if (userTier === "premium") {
      dailyLimit = currentSettings2.premiumDailyViewLimit;
    }
    const currentCount = Number(viewsToday) || 0;
    const isUnlimited = dailyLimit === "unlimited";
    const hasAccess = isUnlimited || currentCount < dailyLimit;
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        allowed: false,
        reason: "DAILY_LIMIT_REACHED",
        userTier,
        dailyLimit,
        viewsToday: currentCount,
        message: `You have reached your daily limit of ${dailyLimit} past questions for your ${userTier.toUpperCase()} account. Upgrade your membership or check back tomorrow for a refreshed quota!`
      });
    }
    return res.json({
      success: true,
      allowed: true,
      userTier,
      dailyLimit,
      viewsToday: currentCount,
      remainingViews: isUnlimited ? "unlimited" : Math.max(0, dailyLimit - currentCount)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "View check failed." });
  }
});

// api/index.ts
dotenv.config();
var app = express2();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Cache-Control, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: true, limit: "10mb" }));
var healthHandler = (_req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "production",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);
app.use("/api/vtu", vtuRouter);
app.use("/vtu", vtuRouter);
app.use("/api/minimart", minimartRouter);
app.use("/minimart", minimartRouter);
app.use("/api/paystack", paystackRouter);
app.use("/paystack", paystackRouter);
app.use("/api/library", libraryRouter);
app.use("/library", libraryRouter);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: "FAILED",
    error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
    message: `The endpoint '${req.originalUrl || req.url}' does not exist on this server.`
  });
});
app.use((err, _req, res, _next) => {
  console.error("API Unhandled Exception:", err);
  res.status(500).json({
    success: false,
    status: "FAILED",
    error: err?.message || "Internal Server Error",
    message: err?.message || "An error occurred while processing the request."
  });
});

export default app;
