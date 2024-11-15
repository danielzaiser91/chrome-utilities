/**
 * Class Based approach to utility.js
 */

/**
 * user Option json concept:
 * crunchyroll: {
 *   AutoLogin: {
 *     isEnabled: true,
 *     profilename: 'Daniel'
 *   }
 * }
 * 
*/
class Feature {
  constructor(name, desc, settings) {
    this.name = name;
    this.description = desc;
    this.settings = settings;

    if (settings) {
      this.isEnabled = settings.defaultEnabled;
    }
  }
}

class UserOption {
  constructor(name, desc, type, defaultValue, opt) {
    this.name = name;
    this.description = desc;
    this.type = type;
    this.defaultValue = defaultValue;
    if (opt) {
      this.disabledReason = opt.disabledReason
    }
  }
}

class AbstractSite {

  /** site Object, must be defined in derived Class */
  site;

  constructor() {
    if (new.target === AbstractSite) throw new TypeError('calling new on Abstract class is not allowed!');
    if (this.abstractMethod?.() === 'override this method!') throw new TypeError('Class must override method!');
    if (this.site.constructor !== Matcher) throw new TypeError('a site class must provide a Matcher!');
  }

  fix() {
    return 'override this method!';
  }
}

class Crunchyroll extends AbstractSite {
  site = {
    matcher: 'crunchyroll.com',
    userOptions: [
      new Feature('PlayBackSpeed', this.getPlayBackSpeedDesc()),
      new Feature('Hotkeys', this.getHotkeyDescHTML()),
      new Feature('AutoSkip', this.getAutoSkipDesc()),
      new Feature('AutoLogin', this.getAutoLoginDesc(), {
        defaultEnabled: false,
        options: [
          new UserOption('Profilename', 'enter Name and pin, to auto login', 'text', '', {
            disabledTooltip: 'is disabled because bla bla',
            isDisabled: true,

          })
        ]
      }),
    ]
  }
  getAutoLoginDesc() {
    return 'this feature will log you into your Profile automatically';
  }
  getAutoSkipDesc() {
    return 'automatically clicks the "skip intro" button for you. Activate it in the video player settings (⚙️).';
  }
  getPlayBackSpeedDesc() {
    return 'this feature allows you to set the playbackrate for videos. Select your desired speed in the video player settings (⚙️).';
  }
  getHotkeyDescHTML() {
    return `<p>
      <kbd>+</kbd>/<kbd>-</kbd> to adjust speed. <span style="color:black">Open video player settings (⚙️), for better control.</span>
      <kbd>alt</kbd> + <kbd>p</kbd>/<kbd>n</kbd> to go to the previous/next episode.
    </p>`;
  }
  fix() {}
}

/**
 * 
  const websiteMatcher = [
    new Matcher('www.keyforsteam.', fixKeyForSteam),
    new Matcher('/twweb/twwebclient', fixTisoware),
    new Matcher('chess.com', fixChessDotCom),
    new Matcher('wiki.fextralife.com', fixFextralife, true),
    new Matcher('twitch.tv', fixTwitch, true),
    new Matcher('static.crunchyroll.com', crunchyrolliFrameHook, false, 'crunchyHook', true),
    new Matcher('crunchyroll.com', fixCrunchyroll, true),
    new Matcher('defenestration.co/pg/surveying', fixPGSurveyHelper),
    new Matcher('youtube.com', fixYoutube),
    new Matcher('netflix.com', fixNetflix, true),
    new Matcher('1movies.life', fix1movies, true),
    new Matcher('amazon.de', fixAmazon, true),
    new Matcher('playerwatchlm24.xyz', fixPlayerWatch24, true),
    new Matcher('fandom.com', fixFandom),
    new Matcher('zkjellberg.github.io/dark-souls-3-cheat-sheet', fixDarkSouls3CheatSheet, true, 'ds3CheatSheet'),
    new Matcher('pogchamps.gg', fixPogChamps, false),
    new Matcher('aternos.org', fixAternos, false),
    new Matcher('disneyplus.com', fixDisneyPlus, true),
    new Matcher('store.steampowered.com/app', fixSteam, false)
  ];
 */
