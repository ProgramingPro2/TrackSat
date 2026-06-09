export interface IpLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

export async function fetchApproximateLocation(): Promise<IpLocation> {
  const response = await fetch('https://ipwho.is/');
  if (!response.ok) {
    throw new Error('Could not determine approximate location');
  }

  const data = (await response.json()) as {
    success?: boolean;
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    message?: string;
  };

  if (!data.success || data.latitude === undefined || data.longitude === undefined) {
    throw new Error(data.message ?? 'Could not determine approximate location');
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city,
    region: data.region,
  };
}
