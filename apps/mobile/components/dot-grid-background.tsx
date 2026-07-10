import { useWindowDimensions, View } from 'react-native';

export function DotGridBackground({
  color = '#333333',
  spacing = 24,
  size = 3,
}: {
  color?: string;
  spacing?: number;
  size?: number;
}) {
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: c * spacing,
            top: r * spacing,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      );
    }
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {dots}
    </View>
  );
}
