import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { colors, layout, paper, tones } from '@/theme';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { CountBubble } from './CountBubble';
import { HeroBlock } from './HeroBlock';
import { IconButton, IconButtonVariantContext } from './IconButton';
import { IconTile } from './IconTile';
import { ListRow } from './ListRow';
import { PaperCard } from './PaperCard';
import { Pill } from './Pill';
import { Stamp } from './Stamp';
import { StarSticker } from './StarSticker';
import { Tape, tapeRotation } from './Tape';

const flat = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

describe('Button (v3: kalın kurşun çerçeve + sert gölge)', () => {
  it('birincil düğme sarı, kurşun çerçeveli ve gölgeli', async () => {
    await render(<Button label="Devam" onPress={() => undefined} testID="b" />);
    const s = flat(screen.getByTestId('b'));
    expect(s.backgroundColor).toBe(colors.accent);
    expect(s.borderWidth).toBe(layout.stroke);
    expect(s.borderColor).toBe(colors.outline);
    expect(String(s.boxShadow)).toContain('4px 4px 0px');
  });

  it('ghost düğmede çerçeve ve gölge yok; devre dışı düğme gölgesiz', async () => {
    await render(
      <>
        <Button label="Link" variant="ghost" onPress={() => undefined} testID="g" />
        <Button label="Kapalı" disabled onPress={() => undefined} testID="d" />
      </>,
    );
    expect(flat(screen.getByTestId('g')).boxShadow).toBeUndefined();
    expect(flat(screen.getByTestId('g')).borderWidth).toBeUndefined();
    expect(flat(screen.getByTestId('d')).boxShadow).toBeUndefined();
  });

  it('yıkıcı düğme mercan dolgu + kurşun yazı', async () => {
    await render(<Button label="Sınıfı sil" variant="destructive" onPress={() => undefined} testID="x" />);
    expect(flat(screen.getByTestId('x')).backgroundColor).toBe(colors.dangerSolid);
    expect(screen.getByText('Sınıfı sil')).toHaveStyle({ color: colors.onDangerSolid });
  });

  it('basılınca gölge kapanır, düğme gölge ofsetince kayar ("gömülme")', async () => {
    await render(<Button label="Devam" onPress={() => undefined} testID="b" />);
    await fireEvent(screen.getByTestId('b'), 'responderGrant', {
      persist: () => undefined,
      nativeEvent: { touches: [], changedTouches: [], timestamp: 0 },
      touchHistory: { touchBank: [], numberActiveTouches: 0, indexOfSingleActiveTouch: -1, mostRecentTimeStamp: 0 },
    });
    const s = flat(screen.getByTestId('b'));
    expect(s.boxShadow).toBeUndefined();
    expect(s.transform).toEqual([{ translateX: 4 }, { translateY: 4 }]);
  });
});

describe('IconButton', () => {
  it('üst çubuk bağlamında kare "pul" olur, açık variant bağlamı ezer', async () => {
    await render(
      <IconButtonVariantContext.Provider value="square">
        <IconButton icon="back" accessibilityLabel="Geri" onPress={() => undefined} testID="in-bar" />
        <IconButton icon="close" accessibilityLabel="Kapat" variant="plain" onPress={() => undefined} testID="plain" />
      </IconButtonVariantContext.Provider>,
    );
    expect(flat(screen.getByTestId('in-bar')).width).toBe(layout.squareButton);
    expect(flat(screen.getByTestId('in-bar')).borderColor).toBe(colors.outline);
    expect(flat(screen.getByTestId('plain')).width).toBe(layout.minTouch);
  });

  it('bağlam yoksa yalnızca ikon (çerçevesiz)', async () => {
    await render(<IconButton icon="more" accessibilityLabel="Diğer" onPress={() => undefined} testID="p" />);
    expect(flat(screen.getByTestId('p')).borderWidth).toBeUndefined();
  });
});

describe('ListRow variant="card"', () => {
  it('kalın çerçeve + sert gölge + yan boşluk alır, ayraç çizmez', async () => {
    await render(<ListRow variant="card" title="Yoklama" onPress={() => undefined} testID="row" />);
    const s = flat(screen.getByTestId('row'));
    expect(s.borderWidth).toBe(layout.stroke);
    expect(String(s.boxShadow)).toContain('3px 3px 0px');
    expect(s.marginHorizontal).toBe(layout.pageX);
  });

  it('varsayılan satır düz (kart değil)', async () => {
    await render(<ListRow title="Ayşe Yılmaz" onPress={() => undefined} testID="row" />);
    const s = flat(screen.getByTestId('row'));
    expect(s.borderWidth).toBeUndefined();
    expect(s.boxShadow).toBeUndefined();
  });
});

describe('Card ve PaperCard', () => {
  it('paper kartı seçilen kâğıt rengini ve büyük gölgeyi alır', async () => {
    await render(
      <Card variant="paper" paper="lila" testID="c">
        <RNText>içerik</RNText>
      </Card>,
    );
    const s = flat(screen.getByTestId('c'));
    expect(s.backgroundColor).toBe(paper.lila);
    expect(String(s.boxShadow)).toContain('5px 5px 0px');
  });

  it('PaperCard pano üstünde koyu mavi gölge kullanır ve bantı ekran okuyucudan gizler', async () => {
    await render(
      <PaperCard onBoard tapeIndex={2} testID="pc">
        <RNText>Kerem</RNText>
      </PaperCard>,
    );
    expect(String(flat(screen.getByTestId('pc')).boxShadow)).toContain(colors.boardDeep);
    expect(screen.getByText('Kerem')).toBeOnTheScreen();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('bant eğimi sıradan kararlı biçimde türetilir (-4..4)', () => {
    expect(tapeRotation(0)).toBe(-4);
    expect(tapeRotation(1)).toBe(3);
    for (let i = 0; i < 30; i++) {
      expect(Math.abs(tapeRotation(i))).toBeLessThanOrEqual(4);
      expect(tapeRotation(i)).toBe(tapeRotation(i));
    }
  });
});

describe('Stamp, StarSticker, Tape (dekoratif)', () => {
  it('damga sözcük ve sayıyı gösterir; etiket verilmezse ekran okuyucudan gizlidir', async () => {
    await render(<Stamp testID="stamp" />);
    expect(screen.getByText('AFERİN', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('+1', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Aferin +1')).toBeNull();
  });

  it('etiket verilirse damga erişilebilir bir görsel olur', async () => {
    await render(<Stamp accessibilityLabel="Aferin +1" />);
    expect(screen.getByLabelText('Aferin +1')).toBeOnTheScreen();
  });

  it('animasyonsuz damga son hâliyle (opak) görünür', async () => {
    await render(<Stamp testID="stamp" />);
    expect(flat(screen.getByTestId('stamp', { includeHiddenElements: true })).opacity).toBeCloseTo(0.94);
  });

  it('çıkartma ve bant etkileşimsiz ve gizli', async () => {
    await render(
      <View>
        <StarSticker />
        <Tape />
      </View>,
    );
    expect(screen.queryAllByRole('image')).toHaveLength(0);
  });
});

describe('küçük görsel öğeler', () => {
  it('CountBubble sayıyı erişilebilir metin olarak verir', async () => {
    await render(<CountBubble value={4} />);
    expect(screen.getByLabelText('4')).toBeOnTheScreen();
  });

  it('Pill ve Badge etiketini erişilebilir metin olarak verir', async () => {
    await render(
      <>
        <Pill label="28 öğrenci" />
        <Badge label="Birikimli" />
      </>,
    );
    expect(screen.getByLabelText('28 öğrenci')).toBeOnTheScreen();
    expect(screen.getByLabelText('Birikimli')).toBeOnTheScreen();
  });

  it('IconTile ton verilirse tonun açık kâğıdını, paper verilirse onu kullanır', async () => {
    const root = () => screen.toJSON() as unknown as { props: { style: unknown } };
    await render(<IconTile icon="book" paper="pembe" />);
    expect(flat(root()).backgroundColor).toBe(paper.pembe);
    expect(flat(root()).borderColor).toBe(colors.outline);
    await screen.unmount();
    await render(<IconTile icon="book" tone="positive" />);
    expect(flat(root()).backgroundColor).toBe(tones.positive.soft);
  });

  it('HeroBlock sınıf adını başlık olarak verir', async () => {
    await render(
      <HeroBlock title="5/B" subtitle="Matematik" sticker>
        <Pill label="28 öğrenci" />
      </HeroBlock>,
    );
    expect(screen.getByRole('header', { name: '5/B' })).toBeOnTheScreen();
    expect(screen.getByText('Matematik')).toBeOnTheScreen();
  });
});
