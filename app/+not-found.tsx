import { Redirect } from 'expo-router';

/** Bilinmeyen bağlantılar (eski ya da hatalı derin bağlantı) ana ekrana yönlendirilir. */
export default function NotFound() {
  return <Redirect href="/" />;
}
