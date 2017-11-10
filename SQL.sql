SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `snaildom`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
`id` int(11) NOT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(60) NOT NULL,
  `loginKey` varchar(255) NOT NULL,
  `about` text NOT NULL,
  `health` int(11) DEFAULT '100',
  `dead` int(1) NOT NULL DEFAULT '0',
  `rank` int(1) NOT NULL DEFAULT '1',
  `factions` text NOT NULL,
  `title` varchar(255) NOT NULL,
  `banned` varchar(11) NOT NULL DEFAULT '0',
  `banDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `banCount` int(11) NOT NULL DEFAULT '0',
  `kickCount` int(1) NOT NULL DEFAULT '0',
  `color` varchar(255) NOT NULL,
  `gold` int(11) NOT NULL DEFAULT '0',
  `level` int(11) NOT NULL DEFAULT '1',
  `knight` int(1) NOT NULL DEFAULT '0',
  `royal` int(1) NOT NULL DEFAULT '0',
  `sword` int(1) NOT NULL DEFAULT '0',
  `inventory` text NOT NULL,
  `furniture` text NOT NULL,
  `friends` text NOT NULL,
  `shellType` varchar(255) NOT NULL DEFAULT 'yellow',
  `shellArt` text NOT NULL,
  `shell` varchar(255) NOT NULL,
  `head` varchar(255) NOT NULL,
  `face` varchar(255) NOT NULL,
  `body` varchar(255) NOT NULL,
  `toy` varchar(255) NOT NULL,
  `ironOre` int(11) NOT NULL DEFAULT '0',
  `goldOre` int(11) NOT NULL DEFAULT '0',
  `silverOre` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=3 ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
 ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
