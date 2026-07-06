import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  BookOpen, 
  Sparkles, 
  Share2, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  ChefHat, 
  Calendar,
  AlertCircle,
  Hash,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import ShareSheet from '../components/ui/ShareSheet';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  image: string;
  tags: string[];
  summary: string;
  content: React.ReactNode;
}

export default function Blog() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [hasLiked, setHasLiked] = useState<Record<string, boolean>>({});

  const sections = [
    { id: "home", label: "Home" },
    { id: "mission", label: "Our Mission" },
    { id: "features", label: "Core Features" },
    { id: "how-it-works", label: "How It Works" },
    { id: "contact", label: "Contact Us" }
  ];

  const categories = ['All', 'Fast Cooking', 'Healthy Eating', 'Budget Friendly', 'Indian Cuisine', 'Dinner Blueprints'];

  const blogPosts = useMemo<BlogPost[]>(() => [
    {
      id: '1',
      slug: 'mastering-simple-food-recipes-5-minute-meals',
      title: 'Mastering Simple Food Recipes: The Ultimate 5-Minute Budget Kitchen Blueprint',
      subtitle: 'How to build high-nutrition, delicious menus using basic pantry staples and fast cooking techniques.',
      category: 'Fast Cooking',
      readTime: '6 min read',
      date: 'July 6, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes', 'lazy dinner ideas', 'easy food in 5 minutes', 'cooking on a budget'],
      summary: 'Ditch the kitchen stress. Explore how simple food recipes, smart ingredients pairing, and express 5-minute techniques can turn everyday cooking into an effortless, budget-friendly culinary ritual.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p className="first-letter:text-5xl first-letter:font-serif first-letter:float-left first-letter:mr-3 first-letter:text-amber-accent first-letter:font-bold">
            The modern kitchen is often a battleground of fatigue. After a long workday, looking through a complicated <span className="text-white font-medium">food recipes list</span> can feel overwhelming, pushing us toward expensive takeout. However, the secret to maintaining consistency isn’t hours of elaborate preparation—it’s mastering <span className="text-white font-medium">simple food recipes</span> that rely on intuitive ingredient pairing, minimal pots, and fast, high-impact cooking methods.
          </p>

          <blockquote className="border-l-2 border-amber-accent pl-4 py-1 my-6 italic text-white/90 font-serif text-lg bg-white/[0.01] rounded-r-xl">
            "Cooking shouldn't be a test of stamina. The most memorable meals are often simple food recipes with few ingredients, cooked with respect for temperatures and simple seasonings."
          </blockquote>

          <h3 className="font-serif text-2xl text-white italic pt-4">The Express Revolution: Easy Food to Make in 5 Minutes</h3>
          <p>
            When time is short, knowing an <span className="text-amber-accent font-medium hover:underline">easy food to make in 5 minutes</span> is your ultimate nutritional shield. You don't need fancy tools to whip up quick meals. Think of express options like a high-protein scrambled egg wrap, a Greek chickpea salad, or seasoned avocado toast. 
          </p>
          <p>
            For those who want to eat clean without spending hours cooking, preparing <span className="text-white font-medium">easy food to make in 5 minutes healthy</span> forms the core of sustainable weight management. By focusing on nutrient-dense, whole ingredients, you can make an <span className="text-white font-medium">easy food to make in 5 minutes healthy for weight loss</span> that keeps you fully satiated.
          </p>

          <div className="my-8 p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
            <span className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-accent block">Quick Reference Table</span>
            <h4 className="font-serif text-xl text-white italic">Express 5-Minute Culinary Blueprints</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-2.5 font-bold uppercase tracking-wider">Dish Concept</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Key Ingredients</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Aesthetic Focus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-400">
                  <tr>
                    <td className="py-3 text-white font-serif italic">5-Minute Warm Hummus Bowl</td>
                    <td className="py-3">Hummus, Olive oil, Smoked paprika, Pine nuts, Warm pita</td>
                    <td className="py-3">Deep swirl in the bowl, dusted with paprika</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-white font-serif italic">Classic Indian Yogurt Raita Salad</td>
                    <td className="py-3">Greek yogurt, Diced cucumber, Roasted cumin, Fresh mint</td>
                    <td className="py-3">Topped with micro-greens and cumin dust</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-white font-serif italic">Express Smashed Berry Dessert</td>
                    <td className="py-3">Raspberries, Greek yogurt, Honey, Mint, Shaved dark chocolate</td>
                    <td className="py-3">Stripe of chocolate across a white porcelain plate</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="font-serif text-2xl text-white italic pt-4">No-Cook and Budget-Friendly Wellness</h3>
          <p>
            Cooking healthy food doesn't require a large budget. When assembling <span className="text-white font-medium">quick, easy healthy meals on a budget</span>, dry beans, oats, eggs, and frozen vegetables are your best friends. 
          </p>
          <p>
            If you want to save on utilities, try making <span className="text-white font-medium">easy food to make in 5 minutes healthy no cook</span> meals like a high-protein Mediterranean salad. Simply combine canned white beans, sliced cherry tomatoes, kalamata olives, dried oregano, and a splash of extra-virgin olive oil. This is a prime example of <span className="text-white font-medium">easy food to make in 5 minutes healthy on a budget</span> that provides essential fiber and clean energy without generating heat.
          </p>

          <h3 className="font-serif text-2xl text-white italic pt-4">Dinner Inspiration for the Busy & Lazy</h3>
          <p>
            We've all had evenings when we have zero cooking motivation. This is where <span className="text-white font-medium">lazy dinner ideas</span> shine. Instead of opening delivery apps, browse some <span className="text-white font-medium">simple food recipes for dinner</span> that utilize what you already have in your fridge.
          </p>
          <p>
            If you're cooking for two, our custom <span className="text-white font-medium">quick dinner ideas for 2</span> and <span className="text-white font-medium">simple food recipes for dinner for two</span> focus on elegant, one-pan dishes that minimize clean-up. For families, look for comforting <span className="text-white font-medium">simple food recipes for dinner for family</span>, or focus on wellness with nourishing <span className="text-white font-medium">simple food recipes for dinner healthy</span> options.
          </p>

          <h3 className="font-serif text-2xl text-white italic pt-4">Indian Culinary Staples: Bold Flavors, Fast Execution</h3>
          <p>
            Indian cuisine is famous for its rich spices, but it also features incredibly fast, comforting meals. If you enjoy spices, our <span className="text-white font-medium">food recipes Indian</span> section includes amazing vegetarian and vegan options.
          </p>
          <p>
            When preparing quick dinners, you can try <span className="text-white font-medium">simple Indian vegetarian recipes for dinner</span> like spiced Yellow Dal Tadka or Jeera Rice. For an evening treat, try an <span className="text-white font-medium">easy snacks to make in 5 minutes indian</span> style, like Chatpata Spiced Chana Salad—canned chickpeas tossed with chopped red onion, green chili, chat masala, and fresh lemon. These dishes are perfect examples of <span className="text-white font-medium">quick dinner recipes Indian</span> food lovers can enjoy on busy weeknights.
          </p>

          <h3 className="font-serif text-2xl text-white italic pt-4">Everyday Habits for Minimal Food Waste</h3>
          <p>
            The easiest way to reduce kitchen waste is to cook with what you have. Developing a collection of <span className="text-white font-medium">simple food recipes for everyday</span> cooking helps you creatively use left-over veggies, proteins, and grains.
          </p>
          <p>
            Whether you are searching for a rapid <span className="text-white font-medium">5-minute recipes for lunch</span>, a comforting <span className="text-white font-medium">5 minute recipes for dinner</span>, or a light <span className="text-white font-medium">5 minute recipes for snacks</span>, you can always make a delicious meal. Finish your meal with a quick <span className="text-white font-medium">5 minute recipes dessert</span> like warm honey-baked bananas, and enjoy the ease of delicious, waste-free home cooking!
          </p>
        </div>
      )
    },
    {
      id: '2',
      slug: 'easy-indian-snacks-5-minutes',
      title: 'Easy Snacks to Make in 5 Minutes: Indian Spiced Express Platters',
      subtitle: 'Elevating roadside chaat flavors into hyper-clean, quick kitchen snacks.',
      category: 'Indian Cuisine',
      readTime: '4 min read',
      date: 'July 5, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy snacks to make in 5 minutes indian', 'food recipes Indian', 'quick dinner recipes Indian'],
      summary: 'Ditch the deep-fryer. Explore clean, high-fiber, bold-flavored easy snacks to make in 5 minutes Indian style, utilizing pantry staples like chickpeas, yogurt, and toasted cumin.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            When the mid-afternoon hunger strikes, we often reach for heavy, processed snacks. But what if you could assemble a nutritious, mouth-watering alternative in the time it takes to brew tea?
          </p>
          <p>
            Our guide to the best <span className="text-white font-medium">easy snacks to make in 5 minutes indian</span> style focuses on fresh, raw, and par-cooked ingredients that require zero heavy frying.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">The Street-Style Spiced Chickpea Tumbler (Chana Chaat)</h4>
          <p>
            Simply open a can of chickpeas, rinse thoroughly with cold water, and toss with finely diced cucumbers, red onions, tomatoes, and cilantro. Add a teaspoon of chaat masala, a squeeze of fresh lime, and a pinch of roasted cumin. This is an incredibly satisfying, fiber-rich option that doubles as one of our favorite <span className="text-white font-medium">simple Indian vegetarian recipes for dinner</span> starters.
          </p>
        </div>
      )
    },
    {
      id: '3',
      slug: 'budget-healthy-meals-for-one',
      title: 'Quick, Easy Healthy Meals on a Budget: Cooking Solo Without Waste',
      subtitle: 'Practical scaling guides to eliminate excess food purchasing and redundant prep.',
      category: 'Budget Friendly',
      readTime: '5 min read',
      date: 'July 4, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick, easy healthy meals on a budget', 'quick easy healthy meals for one', 'quick easy healthy meals for weight loss'],
      summary: 'A mathematical and tactical guide to designing single-serving meals that maximize raw ingredients and reduce weekly checkout expenses.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Cooking for one can be challenging. Most grocery items are packaged for families, leading to leftover ingredients that often go to waste.
          </p>
          <p>
            By shifting to <span className="text-white font-medium">quick, easy healthy meals on a budget</span>, you can shop smart and buy exactly what you need. Focus on ingredients you can easily divide, like block tofu, eggs, loose spinach, and loose sweet potatoes.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">The Golden Rule of Single-Portion Prep</h4>
          <p>
            When making <span className="text-white font-medium">quick easy healthy meals for one</span>, try to cook a base grain (like quinoa or brown rice) in a small batch, then vary your proteins and fresh toppings daily. This is also ideal for <span className="text-white font-medium">quick easy healthy meals for weight loss</span> because it makes calorie tracking simple and keeps meals portion-controlled.
          </p>
        </div>
      )
    },
    {
      id: '4',
      slug: 'quick-dinner-ideas-for-2-simple-food-recipes',
      title: 'Quick Dinner Ideas for 2: Simple Food Recipes for Dinner and Late Nights',
      subtitle: 'Nourishing plans for two that reduce dirty pans and kitchen fatigue.',
      category: 'Dinner Blueprints',
      readTime: '5 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Chef Marcus Vance',
        role: 'Culinary Director & Food Anthropologist',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick dinner ideas for 2', 'simple food recipes for dinner', 'lazy dinner ideas', 'simple food recipes for dinner for two'],
      summary: 'Making dinner for two should not be a chore. Discover simple food recipes for dinner that take the stress out of cooking, featuring quick dinner ideas for 2 and lazy dinner ideas for family meals.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            After a long day, preparing a meal can feel like a heavy task. We all search for <span className="text-white font-medium">Lazy dinner ideas</span> that satisfy our cravings without keeping us at the stove for hours. If you are cooking with a partner, our curated list of <span className="text-white font-medium">Quick dinner ideas for 2</span> will revolutionize your evening routine.
          </p>
          <p>
            When searching for <span className="text-white font-medium">Simple food recipes for dinner</span>, it is important to find balanced recipes that use minimal pans. Our favorite <span className="text-white font-medium">Simple food recipes for dinner for two</span> focus on one-pot pasta bakes, pan-seared fish with quick lemon asparagus, and custom loaded vegetable quesadillas.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Dinner for the Whole Family</h4>
          <p>
            If you are cooking for a larger table, these concepts easily scale up into <span className="text-white font-medium">Simple food recipes for dinner for family</span> gatherings. You can elevate standard dinners with <span className="text-white font-medium">Simple food recipes for dinner healthy</span> choices, like garlic-herb roasted chicken breasts alongside oven-roasted broccoli.
          </p>
          <p>
            For those times when you need food on the table instantly, you can rely on our easy <span className="text-white font-medium">5 minute recipes for dinner</span> like customized gourmet dynamic grain bowls or classic loaded wraps. Try these fast tips tonight!
          </p>
        </div>
      )
    },
    {
      id: '5',
      slug: 'food-recipes-breakfast-guide-easy-5-minutes',
      title: 'Food Recipes Breakfast Guide: Easy Food to Make in 5 Minutes for Kids and Family',
      subtitle: 'Jumpstart your morning with delicious, quick meals using our food recipes app.',
      category: 'Fast Cooking',
      readTime: '4 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=1200',
      tags: ['food recipes breakfast', 'easy food to make in 5 minutes', 'food recipes app', 'easy food to make in 5 minutes for kids'],
      summary: 'Mornings are fast, but your breakfast shouldn\'t be sacrificed. Learn the best easy food to make in 5 minutes with our step-by-step food recipes breakfast guide for family wellness.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            A high-energy day begins with the ultimate breakfast. Many of us browse our <span className="text-white font-medium">Food recipes app</span> searching for delicious breakfast inspirations. Our comprehensive <span className="text-white font-medium">Food recipes breakfast</span> guide highlights dishes that are rich in nutrients yet fast to prepare.
          </p>
          <p>
            If your morning is chaotic, knowing some <span className="text-white font-medium">Easy food to make in 5 minutes</span> is a lifesaver. You can make an <span className="text-white font-medium">Easy food to make in 5 minutes with few ingredients</span>, such as a high-protein cottage cheese berry bowl or a rapid spinach egg scramble.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Healthy and Fast Meals for Your Loved Ones</h4>
          <p>
            For parents, creating <span className="text-white font-medium">Easy food to make in 5 minutes for kids</span> ensures your little ones get proper nutrition before school without any fuss. You can prepare delicious, warm oat bowls or berry-banana Greek yogurt parfaits that double as <span className="text-white font-medium">Easy food to make in 5 minutes for family</span> breakfasts.
          </p>
          <p>
            By choosing an <span className="text-white font-medium">Easy food to make in 5 minutes healthy</span>, you can skip sugary packaged cereals. Use these smart meal ideas to enjoy peaceful, nutritious, and incredibly speedy mornings with your loved ones!
          </p>
        </div>
      )
    },
    {
      id: '6',
      slug: 'quick-easy-healthy-meals-for-weight-loss',
      title: 'Quick Easy Healthy Meals for Weight Loss: Simple Food Recipes for Everyday Wellness',
      subtitle: 'Nutrient-dense single servings and smart meal prep strategies.',
      category: 'Healthy Eating',
      readTime: '6 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&q=80&w=1200',
      tags: ['quick easy healthy meals for weight loss', 'simple food recipes for every day', 'food recipes list'],
      summary: 'Sustain your fitness goals with our handpicked food recipes list. Learn to make quick easy healthy meals for one and master smart portion control without sacrificing taste.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Weight management doesn\'t have to mean eating bland, boring foods. By organizing your kitchen around a curated <span className="text-white font-medium">Food recipes list</span>, you can enjoy delicious, vibrant dishes while staying in a calorie deficit.
          </p>
          <p>
            Our core mission is sharing <span className="text-white font-medium">Simple food recipes for every day</span> that are high in fiber and rich in lean proteins. Preparing <span className="text-white font-medium">Quick easy healthy meals for weight loss</span> is much simpler when you have pre-washed greens and cooked grains ready in your fridge.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">No-Cook and Single-Portion Solutions</h4>
          <p>
            For those living alone, cooking single-portion meals is easy with our <span className="text-white font-medium">Quick easy healthy meals for one</span> blueprint. You can whip up an <span className="text-white font-medium">Easy food to make in 5 minutes healthy no cook</span> meal, such as a fiber-packed Mediterranean cucumber and bean salad dressed with fresh lemon and a splash of olive oil.
          </p>
          <p>
            This is an exceptional example of an <span className="text-white font-medium">Easy food to make in 5 minutes healthy for weight loss</span> that keeps you feeling satisfied for hours. Browse our menu planner today to build your custom daily routine!
          </p>
        </div>
      )
    },
    {
      id: '7',
      slug: 'easy-snacks-to-make-in-5-minutes-indian-spiced',
      title: 'Easy Snacks to Make in 5 Minutes: Indian Spiced Vegetarian Platters',
      subtitle: 'A high-flavor culinary journey featuring authentic spices and quick ingredients.',
      category: 'Indian Cuisine',
      readTime: '5 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Pooja Nair',
        role: 'Traditional Spice Specialist',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&q=80&w=1200',
      tags: ['easy snacks to make in 5 minutes indian', 'food recipes Indian', 'quick dinner recipes Indian', 'food recipes with ingredients'],
      summary: 'Add vibrant spice to your routine with quick dinner recipes Indian style. Explore simple Indian vegetarian recipes for dinner and high-fiber easy snacks to make in 5 minutes Indian style.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Traditional spice profiles have a unique way of turning plain ingredients into something extraordinary. If you enjoy bold, aromatic tastes, exploring <span className="text-white font-medium">Food recipes Indian</span> style is an incredibly rewarding culinary experience.
          </p>
          <p>
            You don\'t need to spend hours over a hot stove to enjoy authentic flavors. Our collection of <span className="text-white font-medium">Quick dinner recipes Indian</span> food lovers can make on busy weeknights includes spiced lentil soups, stir-fried vegetables, and express flatbreads.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Quick Indian Street-Food Inspired Snacks</h4>
          <p>
            When hunger strikes in the afternoon, try an <span className="text-white font-medium">Easy snacks to make in 5 minutes indian</span> style, like a tangy Tomato-Onion Peanut Chaat. It is a simple dish that you can quickly customize using our interactive <span className="text-white font-medium">Food recipes With ingredients</span> checklist.
          </p>
          <p>
            For a more substantial evening meal, try our comforting, high-protein <span className="text-white font-medium">Simple Indian vegetarian recipes for dinner</span>, like the classic Quick Tadka Dal paired with cumin rice. Experience the richness of traditional spices in record time!
          </p>
        </div>
      )
    },
    {
      id: '8',
      slug: 'simple-food-recipes-for-students-budget-meals',
      title: 'Simple Food Recipes for Students: Quick, Easy Healthy Meals on a Budget',
      subtitle: 'A survival guide for busy college students looking for cheap, delicious food.',
      category: 'Budget Friendly',
      readTime: '6 min read',
      date: 'July 7, 2026',
      author: {
        name: 'Sarah Jenkins',
        role: 'Eco-Kitchen Financial Advisor',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      image: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&q=80&w=1200',
      tags: ['simple food recipes for students', 'quick, easy healthy meals on a budget', 'food recipes website', 'simple food recipes website'],
      summary: 'Student life is busy, but you can still eat well! Check out simple food recipes for students, easy food to make in 5 minutes healthy on a budget, and simple food recipes snacks.',
      content: (
        <div className="space-y-6 font-sans text-sm sm:text-base text-gray-300 leading-relaxed font-light">
          <p>
            Being a student means balancing classes, homework, and social life. Often, we don\'t have much money or time to spend on cooking. That is why we created a clean, modern <span className="text-white font-medium">Food recipes Website</span> to help you cook fast, healthy meals.
          </p>
          <p>
            Our dedicated <span className="text-white font-medium">Simple food recipes website</span> contains a vast collection of delicious meals. If you browse our <span className="text-white font-medium">Simple food recipes</span> category, you\'ll find dishes designed specifically for low budgets and tiny dorm kitchens.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Budget Cooking and Quick Snacks</h4>
          <p>
            We also share popular visual guides on our <span className="text-white font-medium">Simple food recipes instagram</span> page. Our guides focus on <span className="text-white font-medium">Simple Food recipes with few ingredients</span>, like 3-ingredient black bean quesadillas or customized microwave egg mugs.
          </p>
          <p>
            When you need a quick study break, try our favorite <span className="text-white font-medium">Simple food recipes snacks</span> or prepare <span className="text-white font-medium">Quick, easy healthy meals on a budget</span>. You can make an <span className="text-white font-medium">Easy food to make in 5 minutes healthy on a budget</span>, such as a high-protein peanut butter banana wrap.
          </p>
          <h4 className="font-serif text-xl text-white italic pt-2">Healthy Lunches and Sweet Treats</h4>
          <p>
            Our student guide also covers quick <span className="text-white font-medium">5-minute Recipes for lunch</span> like seasoned chickpea salad wraps. For a midday energy boost, try a fast <span className="text-white font-medium">5 minute recipes for snacks</span>.
          </p>
          <p>
            If you want something sweet, look up <span className="text-white font-medium">Simple Food recipes sweet</span> desserts like chocolate avocado pudding or our fast <span className="text-white font-medium">5 minute recipes dessert</span> mug cake. Best of all, all our <span className="text-white font-medium">Food recipes in English</span> are explained step-by-step with simple, clear instructions. Try our easy <span className="text-white font-medium">food recipes</span> today to eat delicious food while keeping your budget safe!
          </p>
        </div>
      )
    }
  ], []);

  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [blogPosts, searchQuery, selectedCategory]);

  // Handle deep-linking via slug query parameter
  const postSlug = searchParams.get('post');
  useEffect(() => {
    if (postSlug) {
      const found = blogPosts.find(p => p.slug === postSlug);
      if (found) {
        setSelectedPost(found);
      } else {
        setSelectedPost(null);
      }
    } else {
      setSelectedPost(null);
    }
  }, [postSlug, blogPosts]);

  const handleSelectPost = (post: BlogPost | null) => {
    if (post) {
      setSearchParams({ post: post.slug });
    } else {
      setSearchParams({});
    }
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHasLiked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentPostUrl = selectedPost 
    ? `${window.location.origin}/blog?post=${selectedPost.slug}` 
    : `${window.location.origin}/blog`;

  return (
    <div className="space-y-10 min-h-screen pb-12">
      {/* 5-Menu Floating Sticky Sub-Navigation Header */}
      <div className="sticky top-0 md:top-20 z-40 bg-onyx/85 backdrop-blur-md border-y border-white/5 py-3 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-accent animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Zero-Waste Culinary Assistant</span>
          </div>
          
          <nav className="flex items-center overflow-x-auto no-scrollbar whitespace-nowrap gap-1.5 py-1 w-full md:w-auto justify-start md:justify-center">
            {sections.map((section) => (
              <Link
                key={section.id}
                to={`/#${section.id}`}
                className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all select-none cursor-pointer text-white/60 hover:text-white hover:bg-white/5 shrink-0"
              >
                {section.label}
              </Link>
            ))}
            <Link
              to="/blog"
              className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all select-none cursor-pointer bg-amber-accent text-black font-extrabold shadow-md shadow-amber-accent/15 shrink-0"
            >
              Blog
            </Link>
          </nav>
        </div>
      </div>

      {/* Blog Hero Header */}
      <div className="relative text-center max-w-4xl mx-auto px-4 pt-4 sm:pt-8 space-y-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-accent/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-white/10 bg-white/[0.02] text-white/80 rounded-full text-[9px] font-black uppercase tracking-widest leading-none">
          <BookOpen className="w-3.5 h-3.5 text-amber-accent" />
          <span>Gourmet Editorial</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl text-white font-normal leading-tight tracking-tight">
          The Kitchen <span className="italic text-amber-accent">Journal</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-light leading-relaxed">
          Expert-crafted cooking guides, budget grocery strategies, and simple food recipes designed to empower home chefs and prevent kitchen waste.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedPost ? (
          // LIST VIEW
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Search and Category Filter Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-3xl">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search articles, keywords, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-coal border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-accent transition-all"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all select-none whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-accent text-black font-extrabold shadow-md shadow-amber-accent/10'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Featured post highlight (Only if category is All or matches Fast Cooking, and there's no search query filter) */}
            {filteredPosts.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
              <div 
                onClick={() => handleSelectPost(filteredPosts[0])}
                className="group relative grid grid-cols-1 lg:grid-cols-12 gap-6 bg-coal border border-white/5 hover:border-amber-accent/20 rounded-[40px] p-6 sm:p-8 shadow-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
              >
                {/* Image */}
                <div className="lg:col-span-7 h-64 sm:h-96 rounded-3xl overflow-hidden relative border border-white/5">
                  <img
                    src={filteredPosts[0].image}
                    alt={filteredPosts[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-[10px] font-bold text-amber-accent uppercase tracking-wider border border-white/5">
                    {filteredPosts[0].category}
                  </div>
                </div>

                {/* Meta details */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6 py-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-accent" />
                        {filteredPosts[0].date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-accent" />
                        {filteredPosts[0].readTime}
                      </span>
                    </div>

                    <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white italic font-normal leading-tight group-hover:text-amber-accent transition-colors">
                      {filteredPosts[0].title}
                    </h2>

                    <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed italic">
                      "{filteredPosts[0].summary}"
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {filteredPosts[0].tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono text-white/30 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <img
                        src={filteredPosts[0].author.avatar}
                        alt={filteredPosts[0].author.name}
                        className="w-10 h-10 rounded-full border border-white/10 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{filteredPosts[0].author.name}</p>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{filteredPosts[0].author.role}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono uppercase font-black tracking-widest text-amber-accent group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                      Read Entry <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Remaining/Filtered Posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, idx) => {
                // Skip the first one in "All" view to prevent duplicate highlights
                if (searchQuery === '' && selectedCategory === 'All' && idx === 0) return null;

                const liked = hasLiked[post.id] || false;

                return (
                  <motion.div
                    key={post.id}
                    onClick={() => handleSelectPost(post)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-coal border border-white/5 hover:border-amber-accent/20 rounded-[32px] overflow-hidden shadow-xl cursor-pointer flex flex-col justify-between h-full transition-all duration-300 hover:translate-y-[-2px]"
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="h-48 overflow-hidden relative border-b border-white/5">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[9px] font-bold text-amber-accent uppercase tracking-wider border border-white/5">
                          {post.category}
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-accent/60" />
                            {post.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-accent/60" />
                            {post.readTime}
                          </span>
                        </div>

                        <h3 className="font-serif text-xl text-white italic font-normal leading-snug group-hover:text-amber-accent transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-xs text-gray-400 font-light leading-relaxed line-clamp-3">
                          {post.summary}
                        </p>
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="px-6 pb-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-8 h-8 rounded-full border border-white/10 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-[10px] font-bold text-white leading-none">{post.author.name}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{post.author.role.split(' ')[0]}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => toggleLike(post.id, e)}
                          className={`p-2 rounded-full hover:bg-white/5 transition-all ${liked ? 'text-rose-500' : 'text-white/30'}`}
                          title="Like Article"
                        >
                          <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-20 bg-coal rounded-[40px] border border-white/5 max-w-md mx-auto space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-accent mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-serif text-2xl text-white italic">No Entries Found</h4>
                  <p className="text-xs text-gray-500 font-light">We couldn't find any articles matching your search query.</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="px-5 py-2 border border-white/10 hover:border-amber-accent text-white hover:text-amber-accent rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          // DETAILED READER VIEW
          <motion.article
            key="reader-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl mx-auto bg-coal border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative"
          >
            {/* Elegant Top Navigation Header inside reader */}
            <div className="h-16 border-b border-white/5 px-6 sm:px-8 flex items-center justify-between">
              <button
                onClick={() => handleSelectPost(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-mono text-amber-accent bg-amber-accent/5 hover:bg-amber-accent/15 border border-amber-accent/20 hover:border-amber-accent/40 uppercase tracking-widest transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Journal</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleLike(selectedPost.id, e)}
                  className={`p-2 rounded-full hover:bg-white/5 border border-white/5 transition-all ${hasLiked[selectedPost.id] ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-white/40'}`}
                >
                  <Heart className="w-4 h-4" fill={hasLiked[selectedPost.id] ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="p-2 rounded-full hover:bg-white/5 border border-white/5 text-white/40 transition-all cursor-pointer"
                  title="Share Article"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Giant Immersive Header Banner */}
            <div className="h-64 sm:h-96 md:h-[420px] overflow-hidden relative border-b border-white/5">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/40 to-black/30" />
              
              {/* Floating Meta */}
              <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 right-6 sm:right-10 space-y-3 sm:space-y-4">
                <span className="px-3.5 py-1 bg-amber-accent text-black rounded-lg text-[9px] font-black uppercase tracking-widest leading-none">
                  {selectedPost.category}
                </span>

                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal leading-tight tracking-tight drop-shadow-md">
                  {selectedPost.title}
                </h1>
              </div>
            </div>

            {/* Author and stats block */}
            <div className="px-6 sm:px-10 py-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPost.author.avatar}
                  alt={selectedPost.author.name}
                  className="w-12 h-12 rounded-full border border-white/10 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-sm font-semibold text-white leading-snug">{selectedPost.author.name}</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{selectedPost.author.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-accent/80" />
                  Published {selectedPost.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-accent/80" />
                  Estimated {selectedPost.readTime}
                </span>
              </div>
            </div>

            {/* Core Body Rich-Text content */}
            <div className="px-6 sm:px-10 py-8 sm:py-10">
              {selectedPost.content}

              {/* Persuasive Call To Action to Use the App */}
              <div className="mt-12 p-8 bg-gradient-to-br from-amber-accent/15 via-white/[0.02] to-transparent border border-amber-accent/30 rounded-[32px] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-accent/15 flex items-center justify-center border border-amber-accent/30">
                    <Sparkles className="w-5 h-5 text-amber-accent animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl text-white italic leading-none">Ready to Cook Smarter?</h4>
                    <p className="text-[10px] font-bold text-amber-accent/60 uppercase tracking-widest mt-1">Combat waste and save money</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
                  Unlock the full power of your kitchen with the <strong className="text-white">Daily Meal Recipe App</strong>. Scan your pantry ingredients, instantly generate professional-grade recipes, and plan your weekly menu. Our users save an average of $120/month on groceries while eliminating household food waste.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {user ? (
                    <Link
                      to="/generate"
                      className="px-6 py-3 bg-amber-accent hover:bg-white text-black text-center font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg shadow-amber-accent/10 active:scale-95 cursor-pointer"
                    >
                      Generate Recipes Now
                    </Link>
                  ) : (
                    <Link
                      to="/auth"
                      className="px-6 py-3 bg-amber-accent hover:bg-white text-black text-center font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg shadow-amber-accent/10 active:scale-95 cursor-pointer"
                    >
                      Get Started Free
                    </Link>
                  )}
                  <Link
                    to="/discover"
                    className="px-6 py-3 border border-white/10 hover:border-white/20 text-white text-center font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all bg-white/[0.01] hover:bg-white/[0.03] active:scale-95 cursor-pointer"
                  >
                    Explore Public Recipes
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom tags and return footer */}
            <div className="px-6 sm:px-10 py-8 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {selectedPost.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-mono text-white/30 bg-white/[0.02] border border-white/5 px-3 py-1 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => { handleSelectPost(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-6 py-3 bg-amber-accent text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all text-center cursor-pointer shadow-lg active:scale-95"
              >
                Return to Journal List
              </button>
            </div>
          </motion.article>
        )}
      </AnimatePresence>

      {/* Share sheet sheet overlay */}
      {selectedPost && (
        <ShareSheet
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          title={selectedPost.title}
          text={selectedPost.summary}
          url={currentPostUrl}
          recipe={null}
        />
      )}
    </div>
  );
}
