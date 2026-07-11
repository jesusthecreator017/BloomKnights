/** Shapes returned by src/routes/api/* — kept hand-in-sync with the server handlers. */

export interface AirQualityResponse {
	current?: {
		us_aqi: number;
		pm2_5: number;
		pm10: number;
		carbon_monoxide: number;
		nitrogen_dioxide: number;
		ozone: number;
	};
	current_units?: Record<string, string>;
}

export interface UvSolarResponse {
	current?: { uv_index: number; shortwave_radiation: number };
	current_units?: { shortwave_radiation: string };
	daily?: {
		uv_index_max: number[];
		sunshine_duration: number[];
		shortwave_radiation_sum: number[];
	};
	daily_units?: { sunshine_duration: string; shortwave_radiation_sum: string };
}

export interface OceanResponse {
	current?: {
		sea_surface_temperature: number | null;
		wave_height: number | null;
		ocean_current_velocity: number | null;
	};
	current_units?: { sea_surface_temperature: string; wave_height: string };
}

export type CoralResponse =
	| {
			available: true;
			time: string;
			lat: number;
			lng: number;
			alertArea: number;
			alertLabel: string;
	  }
	| { available: false; reason: string };

export interface MarineSpecies {
	name: string;
	common?: string;
	count: number;
}

export interface MarineLifeResponse {
	total: number;
	sampled: number;
	species: MarineSpecies[];
}

export type PlaceKind = "recycling" | "charging" | "waste";

export interface Place {
	id: number;
	name: string;
	lat: number;
	lng: number;
	kind: string;
}

export interface PlacesResponse {
	kind: string;
	count: number;
	places: Place[];
}

export interface EmissionsEntry {
	country: string;
	rank: number;
	emissions: {
		co2: number;
		ch4: number;
		n2o: number;
		co2e_100yr: number;
		co2e_20yr: number;
	};
	worldEmissions: {
		co2: number;
		ch4: number;
		n2o: number;
		co2e_100yr: number;
		co2e_20yr: number;
	};
}

export interface EmissionsResponse {
	country: string;
	cached: boolean;
	stale?: boolean;
	data: EmissionsEntry[];
}

export interface EcoEvent {
	id: string;
	name: string;
	description: string;
	category: string;
	date: string;
	lat: number;
	lng: number;
	city: string;
	url: string;
}

export interface QuizSummary {
	slug: string;
	title: string;
	category: string;
	questionCount: number;
	totalPoints: number;
}

export interface QuizQuestion {
	id: number;
	prompt: string;
	choices: string[];
	points: number;
}

export interface QuizDetail {
	slug: string;
	title: string;
	category: string;
	questions: QuizQuestion[];
}

export interface QuizResultItem {
	questionId: number;
	correctIndex: number;
	yourAnswer: number | null;
	correct: boolean;
	explanation: string;
}

export interface QuizSubmitResult {
	status: "graded";
	score: number;
	maxScore: number;
	results: QuizResultItem[];
}

export interface ApiErrorBody {
	error: string;
}

export interface LeaderboardEntry {
	rank: number;
	userId: string;
	name: string;
	points: number;
	quizzesTaken: number;
}

export interface LeaderboardResponse {
	entries: LeaderboardEntry[];
	me: LeaderboardEntry | null;
}
