// A small pool of short poem excerpts, every entry public domain in the US
// (pre-1929) and clearly attributed. Each piece of art in `artwork.ts` carries
// a few subject-matter tags; we intersect those with the tags on each poem
// here to find candidates, and a seeded RNG picks one per placement. Two
// placements of the same painting in different rooms can end up with
// different poems, but every poem stays related to the subject.

export type Poem = {
  text: string;
  author: string;
  source?: string;
  year?: string;
  tags: string[];
};

export const POEMS: Poem[] = [
  {
    text: `I sing the body electric;
The armies of those I love engirth me, and I engirth them.`,
    author: 'Walt Whitman',
    source: 'I Sing the Body Electric',
    year: '1855',
    tags: ['figure', 'body', 'masculine'],
  },
  {
    text: `If anything is sacred the human body is sacred,
And the glory and sweet of a man is the token of manhood untainted.`,
    author: 'Walt Whitman',
    source: 'I Sing the Body Electric',
    year: '1855',
    tags: ['figure', 'body', 'sacred', 'masculine'],
  },
  {
    text: `Do I contradict myself?
Very well then I contradict myself,
(I am large, I contain multitudes.)`,
    author: 'Walt Whitman',
    source: 'Song of Myself',
    year: '1855',
    tags: ['portrait', 'identity', 'collage'],
  },
  {
    text: `I think I could turn and live with animals, they are so placid and self-contain'd,
I stand and look at them long and long.`,
    author: 'Walt Whitman',
    source: 'Song of Myself',
    year: '1855',
    tags: ['animal'],
  },
  {
    text: `Stranger, if you passing meet me and desire to speak to me,
why should you not speak to me?
And why should I not speak to you?`,
    author: 'Walt Whitman',
    source: 'To You',
    year: '1860',
    tags: ['portrait', 'identity'],
  },
  {
    text: `Tyger Tyger, burning bright,
In the forests of the night;
What immortal hand or eye,
Could frame thy fearful symmetry?`,
    author: 'William Blake',
    source: 'The Tyger',
    year: '1794',
    tags: ['animal', 'masculine', 'sacred', 'mortality'],
  },
  {
    text: `To see a World in a Grain of Sand
And a Heaven in a Wild Flower,
Hold Infinity in the palm of your hand
And Eternity in an hour.`,
    author: 'William Blake',
    source: 'Auguries of Innocence',
    year: '1803',
    tags: ['cosmos', 'sacred', 'youth'],
  },
  {
    text: `I wander thro' each charter'd street,
Near where the charter'd Thames does flow.
And mark in every face I meet
Marks of weakness, marks of woe.`,
    author: 'William Blake',
    source: 'London',
    year: '1794',
    tags: ['portrait', 'mortality', 'mask'],
  },
  {
    text: `Because I could not stop for Death —
He kindly stopped for me —
The Carriage held but just Ourselves —
And Immortality.`,
    author: 'Emily Dickinson',
    source: 'Poem 479',
    year: 'c. 1863',
    tags: ['mortality'],
  },
  {
    text: `I'm Nobody! Who are you?
Are you – Nobody – too?
Then there's a pair of us!
Don't tell! they'd advertise — you know!`,
    author: 'Emily Dickinson',
    source: 'Poem 260',
    year: 'c. 1861',
    tags: ['portrait', 'identity', 'whimsy'],
  },
  {
    text: `Hope is the thing with feathers —
That perches in the soul —
And sings the tune without the words —
And never stops — at all —`,
    author: 'Emily Dickinson',
    source: 'Poem 314',
    year: 'c. 1861',
    tags: ['animal', 'youth', 'sacred'],
  },
  {
    text: `For I will consider my Cat Jeoffry.
For he is the servant of the Living God, duly and daily serving him.`,
    author: 'Christopher Smart',
    source: 'Jubilate Agno',
    year: 'c. 1759',
    tags: ['animal', 'sacred', 'whimsy'],
  },
  {
    text: `I caught this morning morning's minion, kingdom of daylight's dauphin,
dapple-dawn-drawn Falcon, in his riding
Of the rolling level underneath him steady air…`,
    author: 'Gerard Manley Hopkins',
    source: 'The Windhover',
    year: '1877',
    tags: ['hero', 'sacred', 'animal'],
  },
  {
    text: `Glory be to God for dappled things —
For skies of couple-colour as a brinded cow;
For rose-moles all in stipple upon trout that swim;`,
    author: 'Gerard Manley Hopkins',
    source: 'Pied Beauty',
    year: '1877',
    tags: ['sacred', 'animal', 'collage'],
  },
  {
    text: `The world is charged with the grandeur of God.
It will flame out, like shining from shook foil`,
    author: 'Gerard Manley Hopkins',
    source: "God's Grandeur",
    year: '1877',
    tags: ['sacred', 'cosmos'],
  },
  {
    text: `Things fall apart; the centre cannot hold;
Mere anarchy is loosed upon the world,
The blood-dimmed tide is loosed, and everywhere
The ceremony of innocence is drowned;`,
    author: 'W. B. Yeats',
    source: 'The Second Coming',
    year: '1919',
    tags: ['hero', 'mortality', 'fantasy'],
  },
  {
    text: `I have spread my dreams under your feet;
Tread softly because you tread on my dreams.`,
    author: 'W. B. Yeats',
    source: 'He Wishes for the Cloths of Heaven',
    year: '1899',
    tags: ['identity', 'sacred', 'youth'],
  },
  {
    text: `Come away, O human child!
To the waters and the wild
With a faery, hand in hand,
For the world's more full of weeping than you can understand.`,
    author: 'W. B. Yeats',
    source: 'The Stolen Child',
    year: '1889',
    tags: ['youth', 'fantasy', 'whimsy'],
  },
  {
    text: `Once out of nature I shall never take
My bodily form from any natural thing,
But such a form as Grecian goldsmiths make
Of hammered gold and gold enamelling.`,
    author: 'W. B. Yeats',
    source: 'Sailing to Byzantium',
    year: '1928',
    tags: ['mask', 'sacred', 'mortality'],
  },
  {
    text: `Smart lad, to slip betimes away
From fields where glory does not stay,
And early though the laurel grows
It withers quicker than the rose.`,
    author: 'A. E. Housman',
    source: 'To an Athlete Dying Young',
    year: '1896',
    tags: ['youth', 'mortality', 'hero'],
  },
  {
    text: `When I was one-and-twenty
I heard a wise man say,
"Give crowns and pounds and guineas
But not your heart away."`,
    author: 'A. E. Housman',
    source: 'When I Was One-and-Twenty',
    year: '1896',
    tags: ['youth'],
  },
  {
    text: `Death, be not proud, though some have called thee
Mighty and dreadful, for thou art not so;`,
    author: 'John Donne',
    source: 'Holy Sonnet X',
    year: '1610',
    tags: ['mortality', 'sacred'],
  },
  {
    text: `The child is father of the man;
And I could wish my days to be
Bound each to each by natural piety.`,
    author: 'William Wordsworth',
    source: 'My Heart Leaps Up',
    year: '1802',
    tags: ['youth', 'sacred', 'identity'],
  },
  {
    text: `The woods are lovely, dark and deep,
But I have promises to keep,
And miles to go before I sleep,
And miles to go before I sleep.`,
    author: 'Robert Frost',
    source: 'Stopping by Woods on a Snowy Evening',
    year: '1923',
    tags: ['mortality', 'cosmos'],
  },
  {
    text: `Tho' much is taken, much abides; and tho'
We are not now that strength which in old days
Moved earth and heaven, that which we are, we are…`,
    author: 'Alfred, Lord Tennyson',
    source: 'Ulysses',
    year: '1842',
    tags: ['hero', 'mortality', 'masculine'],
  },
  {
    text: `Under the wide and starry sky,
Dig the grave and let me lie.
Glad did I live and gladly die,
And I laid me down with a will.`,
    author: 'Robert Louis Stevenson',
    source: 'Requiem',
    year: '1887',
    tags: ['mortality', 'hero'],
  },
  {
    text: `And so, all the night-tide, I lie down by the side
Of my darling — my darling — my life and my bride,
In her sepulchre there by the sea —
In her tomb by the sounding sea.`,
    author: 'Edgar Allan Poe',
    source: 'Annabel Lee',
    year: '1849',
    tags: ['mortality', 'portrait'],
  },
  {
    text: `Someone, I tell you, will remember us,
even in another time.`,
    author: 'Sappho',
    source: 'Fragment 147',
    year: 'c. 600 BCE',
    tags: ['mortality', 'identity', 'portrait'],
  },
  {
    text: `April is the cruellest month, breeding
Lilacs out of the dead land, mixing
Memory and desire, stirring
Dull roots with spring rain.`,
    author: 'T. S. Eliot',
    source: 'The Waste Land',
    year: '1922',
    tags: ['mortality', 'collage'],
  },
  {
    text: `so much depends
upon

a red wheel
barrow`,
    author: 'William Carlos Williams',
    source: 'The Red Wheelbarrow',
    year: '1923',
    tags: ['whimsy', 'collage'],
  },
  {
    text: `I, too, dislike it: there are things that are important beyond all this fiddle.
Reading it, however, with a perfect contempt for it, one discovers in
it after all, a place for the genuine.`,
    author: 'Marianne Moore',
    source: 'Poetry',
    year: '1919',
    tags: ['identity', 'portrait', 'whimsy'],
  },
  {
    text: `I am the people — the mob — the crowd — the mass.
Do you know that all the great work of the world is done through me?`,
    author: 'Carl Sandburg',
    source: 'I Am the People, the Mob',
    year: '1916',
    tags: ['collage', 'identity', 'masculine'],
  },
  {
    text: `Out of the cradle endlessly rocking,
Out of the mocking-bird's throat, the musical shuttle,
Out of the Ninth-month midnight…`,
    author: 'Walt Whitman',
    source: 'Out of the Cradle Endlessly Rocking',
    year: '1859',
    tags: ['youth', 'cosmos'],
  },
  {
    text: `In the bleak midwinter, frosty wind made moan,
Earth stood hard as iron, water like a stone;`,
    author: 'Christina Rossetti',
    source: 'In the Bleak Midwinter',
    year: '1872',
    tags: ['sacred', 'mortality', 'cosmos'],
  },
  {
    text: `He clasps the crag with crooked hands;
Close to the lonely lands,
Ringed with the azure world, he stands.`,
    author: 'Alfred, Lord Tennyson',
    source: 'The Eagle',
    year: '1851',
    tags: ['hero', 'animal', 'cosmos'],
  },
];

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic per-placement poem selection. Filter the pool down to poems
// that share at least one tag with the painting; score each by intersection
// size (so a piece tagged "hero, mask, fantasy" prefers a poem hitting two
// or three of those over one hitting only one); then pick from the
// top-scoring set using a hash of the placement id + painting id.
export function pickPoem(paintingTags: string[], placementSeed: string | number): Poem {
  const tagSet = new Set(paintingTags);
  type Scored = { poem: Poem; score: number };
  const scored: Scored[] = [];
  let bestScore = 0;
  for (const p of POEMS) {
    let s = 0;
    for (const t of p.tags) if (tagSet.has(t)) s++;
    if (s > 0) {
      scored.push({ poem: p, score: s });
      if (s > bestScore) bestScore = s;
    }
  }

  if (scored.length === 0) {
    // No tag overlap — fall back to whichever poem looks broadest. Sandburg
    // is tagged 'identity' + 'collage' which fits most pieces here, but any
    // deterministic fallback is fine.
    return POEMS[hash(String(placementSeed)) % POEMS.length];
  }

  // Keep top-tier matches; if that's a thin pool (<3 candidates) we widen to
  // any single-tag match so two placements of the same painting don't
  // inevitably show the same poem.
  let top: Poem[];
  if (bestScore >= 2) {
    top = scored.filter((s) => s.score >= 2).map((s) => s.poem);
    if (top.length < 3) top = scored.map((s) => s.poem);
  } else {
    top = scored.map((s) => s.poem);
  }
  const idx = hash(String(placementSeed)) % top.length;
  return top[idx];
}
