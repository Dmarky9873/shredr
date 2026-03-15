import HomeButton from "../components/HomeButton";
import FadeInStagger from "../components/FadeInStagger";

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <HomeButton />
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] text-center space-y-8">
        <div className="text-center">
          <h1 className="text-display font-bold mb-4">Shredr</h1>
          <p className="text-lead">By Daniel Markusson</p>
        </div>

        <FadeInStagger className="max-w-lg space-y-8" delay={400}>
          <div>
            <h2 className="mb-4">About Shredr</h2>
            <p className="text-lg">
              Shredr is built for people who care about making smarter food
              choices—whether your goal is building muscle, cutting weight, or
              simply eating healthier. Our app scrapes restaurant menus and
              breaks down nutrition so you can instantly see which items give
              you the best return for your calories.
            </p>
          </div>

          <div>
            <p className="text-lg">
              To use Shredr, simply search for a restaurant. You&apos;ll
              instantly see three tables (or one table and options to switch
              between them, if on mobile). These tables rank menu items by their
              nutrient-to-calorie ratio, so you can easily find the best options
              for your goals. Trying to cut? Use the protein table to ensure you
              hit your protein goals while minimizing calorie intake. Have a big
              day of training ahead? The carb table will help fuel your
              performance without overdoing it on calories.
            </p>
          </div>

          <div>
            <p className="text-lg">
              Working in tandem with your calorie counter, Shredr helps you plan
              out your meal so you can hit each and every macro goal. Every menu
              item is ranked by nutrient-to-calorie ratio, so you can find the
              dish with the most protein for the fewest calories—or flip the
              view to focus on carbs or fats instead. We&apos;re combining
              performance, convenience, and transparency to make eating out work
              for your fitness goals instead of against them.
            </p>
          </div>

          <div>
            <h2 className="mb-4">Our Story</h2>
            <p className="text-lg">
              They say the best products are born from personal need. Shredr was
              exactly that. Ask anyone who counts calories—you start to dread
              going out with friends. Flipping through online PDFs and obscure
              sites just to find nutrition info kills the vibe. It was something
              that desperately needed automation.
            </p>
          </div>

          <div>
            <p className="text-lg">
              So, armed with a bit of free time during the summer, I set out to
              create Shredr. My goal was simple: make eating out easier and more
              aligned with fitness goals. The result is an effective, simple
              tool that does exactly what it set out to do.
            </p>
          </div>
        </FadeInStagger>
      </div>

      {/* Desktop: Alternating layout */}
      <div className="hidden lg:flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] space-y-16">
        <div className="text-center">
          <h1 className="text-display font-bold mb-4">Shredr</h1>
          <p className="text-lead">By Daniel Markusson</p>
        </div>

        <FadeInStagger className="w-full max-w-6xl space-y-16" delay={500}>
          <div className="flex justify-start">
            <div className="max-w-2xl text-left">
              <h2>About Shredr</h2>
              <p className="text-lg">
                Shredr is built for people who care about making smarter food
                choices—whether your goal is building muscle, cutting weight, or
                simply eating healthier. Our app scrapes restaurant menus and
                breaks down nutrition so you can instantly see which items give
                you the best return for your calories.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-2xl text-right">
              <p className="text-lg">
                To use Shredr, simply search for a restaurant. You&apos;ll
                instantly see three tables (or one table and options to switch
                between them, if on mobile). These tables rank menu items by
                their nutrient-to-calorie ratio, so you can easily find the best
                options for your goals. Trying to cut? Use the protein table to
                ensure you hit your protein goals while minimizing calorie
                intake. Have a big day of training ahead? The carb table will
                help fuel your performance without overdoing it on calories.
              </p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-2xl text-left">
              <p className="text-lg">
                Working in tandem with your calorie counter, Shredr helps you
                plan out your meal so you can hit each and every macro goal.
                Every menu item is ranked by nutrient-to-calorie ratio, so you
                can find the dish with the most protein for the fewest
                calories—or flip the view to focus on carbs or fats instead.
                We&apos;re combining performance, convenience, and transparency
                to make eating out work for your fitness goals instead of
                against them.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="max-w-2xl text-right">
              <h2>Our Story</h2>
              <p className="text-lg">
                They say the best products are born from personal need. Shredr
                was exactly that. Ask anyone who counts calories—you start to
                dread going out with friends. Flipping through online PDFs and
                obscure sites just to find nutrition info kills the vibe. It was
                something that desperately needed automation.
              </p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-2xl text-left">
              <p className="text-lg">
                So, armed with a bit of free time during the summer, I set out
                to create Shredr. My goal was simple: make eating out easier and
                more aligned with fitness goals. The result is an effective,
                simple tool that does exactly what it set out to do.
              </p>
            </div>
          </div>
        </FadeInStagger>
      </div>
    </div>
  );
}
